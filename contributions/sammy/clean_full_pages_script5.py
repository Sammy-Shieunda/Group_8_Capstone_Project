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


def rectangularity(contour):
    """
    How well a contour's shape fills its own minimum-area rotated rectangle.
    A true sheet of paper, photographed at an angle, scores close to 1.0
    here. A blob that has swept in stray background - carpet bleeding into
    the paper, an L-shaped patch of couch fabric, a blanket corner - scores
    much lower, since it isn't rectangular. This is what lets us reject a
    bad color-based crop instead of silently warping the wrong region.
    """
    area = cv2.contourArea(contour)
    rect = cv2.minAreaRect(contour)
    rect_area = rect[1][0] * rect[1][1]
    if rect_area == 0:
        return 0.0
    return area / rect_area


def crop_to_paper_by_color(img, sat_max=45, val_min=120):
    """
    Separates the white/off-white paper from a colored background (desk,
    table, folder) using color rather than trying to detect the physical
    edges of the page. This works well when the background is clearly more
    saturated than the paper - e.g. a green/worn desk - since edge
    detection alone tends to get tripped up by scratches, rust, and wood
    grain on desks like that.

    Assumes the paper is lighter and less saturated (less colorful) than
    what's behind it. It will not help if the background is also pale
    (beige carpet, couch fabric, a blanket) - in that case this returns
    None and the caller should fall back to crop_to_paper_by_edges.
    """
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)
    mask = ((s < sat_max) & (v > val_min)).astype(np.uint8) * 255

    kernel = np.ones((7, 7), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if num_labels <= 1:
        return None

    idx = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    area_frac = stats[idx, cv2.CC_STAT_AREA] / (img.shape[0] * img.shape[1])
    if area_frac < 0.15:
        return None

    comp_mask = (labels == idx).astype(np.uint8) * 255
    contours, _ = cv2.findContours(comp_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    c = max(contours, key=cv2.contourArea)

    # Reject blobs that aren't reasonably rectangular. This is what catches
    # cases where a pale carpet/couch/blanket gets swept in with the paper
    # under these lenient thresholds, producing an odd, non-rectangular
    # blob rather than a clean page shape.
    if rectangularity(c) < 0.7:
        return None

    rect = cv2.minAreaRect(c)
    box = cv2.boxPoints(rect)
    return four_point_transform(img, box)


def crop_to_paper_by_edges(img):
    """
    Fallback for pale/low-contrast backgrounds (beige carpet, couch fabric,
    blankets) where color alone can't tell paper from background. Uses a
    classic document-scanner approach instead: find the sheet's own edges
    (the four sides of the page itself) rather than trying to color-segment
    it away from what's behind it.

    Looks for the largest contour in the edge map that approximates a
    convex quadrilateral and covers a meaningful fraction of the frame. If
    no clean quadrilateral turns up, falls back to the rotated bounding box
    of the single largest, sufficiently rectangular edge-blob.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    edges = cv2.dilate(edges, np.ones((5, 5), np.uint8), iterations=2)

    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    img_area = img.shape[0] * img.shape[1]
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]

    for c in contours:
        area_frac = cv2.contourArea(c) / img_area
        if area_frac < 0.2:
            continue

        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)

        if len(approx) == 4 and cv2.isContourConvex(approx):
            return four_point_transform(img, approx.reshape(4, 2).astype("float32"))

    # No clean 4-point quadrilateral found; fall back to the rotated
    # bounding box of the single largest edge-blob, same idea as the
    # color-based path, gated by the same rectangularity check.
    c = contours[0]
    if cv2.contourArea(c) / img_area < 0.2 or rectangularity(c) < 0.6:
        return None
    rect = cv2.minAreaRect(c)
    box = cv2.boxPoints(rect)
    return four_point_transform(img, box)


def crop_to_paper(img):
    """
    Tries color-based segmentation first (fast, and works well against a
    saturated background like a green desk), then falls back to
    edge-based document detection for pale backgrounds - beige carpet,
    couch fabric, blankets - where paper and background are too close in
    color/brightness for the color mask to separate cleanly.

    Returns None if neither approach finds a confident, sufficiently
    rectangular page - in which case the caller should use the full frame
    as-is.
    """
    result = crop_to_paper_by_color(img)
    if result is not None:
        return result
    return crop_to_paper_by_edges(img)


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

    # 5. Adaptive binarization (Saves faint lines from the void)
    binary = cv2.adaptiveThreshold(
        normalized, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        21, 10
    )

    # 6. Noise cleanup (Stitches the corpses of broken lines back together)
    bridge_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 1))
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, bridge_kernel)

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
    input_dir = Path("/content/drive/MyDrive/normal images")
    output_dir = Path("/content/drive/MyDrive/normal images_Cleaned")

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
