# Dysgraphia-screening-capstoneEarly Dysgraphia Screening from Handwriting
Overview

This project explores the use of Deep Learning to support the early screening of dysgraphia in children through handwriting analysis.

Dysgraphia is a learning difficulty that affects handwriting quality, including letter formation, spacing, alignment, and writing consistency. Early identification can help learners receive timely support and intervention.

This project does not provide a diagnosis. Instead, it serves as a screening tool that flags handwriting samples that may require further assessment by educational specialists, occupational therapists, or psychologists.

Project Objective

To develop an AI-powered screening system that:

Accepts handwriting images
Preprocesses and standardizes samples
Uses Deep Learning to predict dysgraphia risk
Flags children who may benefit from further assessment
Dataset

The project uses a handwriting image dataset containing:

1,625 handwriting images
1,049 Potential Dysgraphia samples (64.5%)
576 Low Potential samples (35.5%)

Dataset split:

Training: 60%
Validation: 20%
Testing: 20%
Data Preprocessing

The preprocessing pipeline included:

Conversion to grayscale
Cropping handwritten regions
Deskewing images
Resizing images to 256 × 256 pixels
Normalization of pixel values (0–1)
Models Used
1. Baseline CNN

A lightweight Convolutional Neural Network was first developed as a baseline model.

Results:

Validation ROC AUC: 0.502
Validation Recall: 0.205

The baseline model performed close to random prediction.

2. Transfer Learning – MobileNetV2

To improve performance, transfer learning was implemented using MobileNetV2.

Training process:

Feature extraction with frozen layers
Partial unfreezing for fine-tuning
Hyperparameter optimization
Threshold calibration using Youden’s J Statistic

Results:

Validation ROC AUC: 0.800
Validation Recall: 0.767
Final Test Results

Performance on unseen test data:

Metric	Score
ROC AUC	0.797
At-risk Recall	79%
Precision	84%
Healthy Recall	73%

These results indicate that the model can support early identification of handwriting patterns associated with dysgraphia while maintaining human oversight.

Project Structure
Group_8_Capstone_Project/
│
├── Data/
├── backend/
├── docs/
├── final/
├── contributions/
│   └── lucy/
│       ├── 01_data_exploration.ipynb
│       ├── 02_data_quality.ipynb
│       ├── Dysgraphia_Early_Screening.pptx
│       ├── dysgraphia raw data.zip
│       ├── norm.zip
│       └── README.md
Technologies Used
Python
TensorFlow / Keras
MobileNetV2
OpenCV
NumPy
Pandas
Matplotlib
Scikit-Learn
Jupyter Notebook
Future Improvements

Potential enhancements include:

Grad-CAM visualization for explainability
Larger and more diverse datasets
Classroom pilot studies
Multi-class dysgraphia severity prediction
Continuous model recalibration
Disclaimer

This system is intended as a screening support tool and should not replace professional assessment or diagnosis. Human specialists should remain part of the decision-making process.

Contributors

Group 8:

Samson Sheiunda
Lucy Wainoga
Emmanuel Gunga
Eric Kisu
Dax Kariuki
Ahmed Noor