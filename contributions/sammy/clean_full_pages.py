import cv2
import numpy as np
from pathlib import Path

try:
    import pytesseract
    HAS_TESSERACT = True
except ImportError:
    HAS_TESSERACT = False


def fix_orientation(img):
    """
    Full pages can come in sideways or upside down, not just slightly tilted.
    This uses Tesseract's orientation detection (OSD) to snap the page to
    0/90/180/270 degrees first. Fine tilt is corrected later.
    """
    if not HAS_TESSERACT:
        return img

    try:
        osd = pytesseract.image_to_osd(img)
        angle = int([line for line in osd.split("\n") if "Rotate" in line][0].split(":")[-1])
    except Exception:
        # OSD fails on very sparse or very noisy pages; just skip and rely on deskew
        return img

    if angle == 0:
        return img
    elif angle == 90:
        return cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
    elif angle == 180:
        return cv2.rotate(img, cv2.ROTATE_180)
    elif angle == 270:
        return cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
    return img


def order_points(pts):
    # Sorts 4 corner points into top-left, top-right, bottom-right, bottom-left
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def four_point_transform(img, pts):
    rect = order_points(pts)
    (tl, tr, br, bl) = rect
    width = int(max(np.linalg.norm(br - bl), np.linalg.norm(tr - tl)))
    height = int(max(np.linalg.norm(tr - br), np.linalg.norm(tl - bl)))
    dst = np.array([[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]], dtype="float32")
    M = cv2.getPerspectiveTransform(rect, dst)
    return cv2.warpPerspective(img, M, (width, height))


def crop_to_paper(img):
    """
    Finds the largest 4-sided shape in the photo and warps it flat, so
    hands, desks, and other background clutter around the page are cut
    out. Only works when the paper's edges are fully visible in frame and
    contrast with the background; if no clean 4-sided edge is found, the
    original image is returned unchanged and a note is printed so that
    image can be checked by hand.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.dilate(cv2.Canny(blur, 50, 150), np.ones((5, 5), np.uint8), iterations=2)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]
    img_area = img.shape[0] * img.shape[1]

    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4 and cv2.contourArea(approx) > 0.2 * img_area:
            return four_point_transform(img, approx.reshape(4, 2))

    return None


def process_image(img_path, output_path):
    img = cv2.imread(str(img_path))
    if img is None:
        print(f"Failed to read {img_path}")
        return

    # 1. Cut out hands/desk/background clutter, keeping just the paper
    paper = crop_to_paper(img)
    if paper is None:
        print(f"  {img_path.name}: could not find a clean paper edge, using full frame")
    else:
        img = paper

    # 2. Snap to upright before anything else, since a sideways page throws
    # off the horizontal-line assumption the deskew step depends on.
    img = fix_orientation(img)

    # 3. Red channel trick (same as the fragment scripts)
    _, _, r = cv2.split(img)

    # 4. Illumination normalization, full pages photographed by phone tend to
    # have more uneven lighting than the cropped fragments did.
    bg_size = max(img.shape[1] // 40, 25)
    bg_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (bg_size, bg_size))
    bg = cv2.morphologyEx(r, cv2.MORPH_DILATE, bg_kernel)
    bg = cv2.GaussianBlur(bg, (21, 21), 0)
    normalized = cv2.divide(r, bg, scale=255)

    # 5. Global binarization
    _, binary = cv2.threshold(normalized, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # 6. Noise cleanup
    cleaned = cv2.medianBlur(binary, 3)

    # 7. Fine deskew (handles small tilts left after the coarse orientation fix)
    kernel_len = max(img.shape[1] // 40, 10)
    horiz_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_len, 1))
    horiz_mask = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, horiz_kernel, iterations=2)

    lines = cv2.HoughLinesP(horiz_mask, 1, np.pi / 180, 50, minLineLength=kernel_len, maxLineGap=20)
    angles = []
    if lines is not None:
        for x1, y1, x2, y2 in lines.reshape(-1, 4):
            angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
            # Full pages can have text lines running in many directions
            # (margins, headers). Only count near-horizontal lines so a
            # stray diagonal mark doesn't skew the estimate.
            if abs(angle) < 20:
                angles.append(angle)

    median_angle = np.median(angles) if angles else 0.0
    (h, w) = cleaned.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
    deskewed = cv2.warpAffine(
        cleaned, M, (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=0
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), deskewed)
    print(f"Processed: {output_path.name} | fine-tilt {median_angle:.2f} degrees")


def main():
    input_dir = Path("/content/drive/MyDrive/Full_Pages_Data")
    output_dir = Path("/content/drive/MyDrive/Full_Pages_Data_Cleaned")

    if not input_dir.exists():
        print(f"Directory '{input_dir}' not found.")
        return

    if not HAS_TESSERACT:
        print("pytesseract not found, skipping 90/180-degree orientation correction. "
              "Only fine tilt will be corrected. Run 'pip install pytesseract' and make "
              "sure the tesseract binary is installed if you need full orientation fixing.")

    image_paths = []
    for ext in ('*.png', '*.jpg', '*.jpeg'):
        image_paths.extend(input_dir.rglob(ext))

    if not image_paths:
        print("No images found.")
        return

    print(f"Processing {len(image_paths)} full-page images...")

    for img_path in image_paths:
        relative_path = img_path.relative_to(input_dir)
        out_path = output_dir / relative_path
        process_image(img_path, out_path)

    print("\nProcessing complete.")


if __name__ == "__main__":
    main()
