/* =========================================================================
   WriteAble — data
   Where a number is a genuine external research figure it is labelled and
   sourced. Where a number is project/demo data (dataset counts, model
   metrics, thresholds) it reflects the capstone's own reported experimental
   results, or — for the live screening demo — is clearly flagged as a
   simulated output.
   ========================================================================= */

const DATA = {

  statRow: [
    { num:"7–15%", tag:"REPORTED IN RESEARCH LITERATURE", desc:"Estimated range commonly cited for school-age children in published literature reviews (general estimates for younger children run lower, around 5–10%)." },
    { num:"21 of 177", tag:"AI-DYSGRAPHIA SCOPING REVIEW, 2025", desc:"Studies that met inclusion criteria in a 2025 scoping review of AI-based approaches to dysgraphia detection from handwriting data." },
    { num:"77 studies", tag:"SCOPING REVIEW, 2021–22", desc:"Peer-reviewed studies charted in a scoping review mapping recent dysgraphia research across children, carers and educators." },
  ],

  researchThemes: [
    "Handwriting difficulties are consistently linked to reduced academic participation and confidence.",
    "Direct handwriting assessment can surface useful information beyond teacher observation alone.",
    "Early identification and referral are repeatedly identified as valuable, though evidence on optimal timing is limited.",
    "Intervention approaches are varied — spanning motor training, technology-assisted tools, and combined methods.",
    "Technology-assisted and integrated approaches show promising engagement and accessibility results, alongside open questions about long-term impact.",
    "Reviewers consistently call for larger, more internationally representative studies.",
  ],

  indicators: [
    { step:"Early writing", items:["Difficulty with drawing or pre-writing patterns","Difficulty controlling writing movements","Difficulty forming basic shapes"] },
    { step:"Emerging handwriting", items:["Inconsistent letter formation","Unusual letter size","Inconsistent spacing","Difficulty staying on a baseline"] },
    { step:"Increasing writing demands", items:["Slow writing","Frequent pauses","Fatigue during writing tasks","Reduced legibility","Difficulty keeping up with classroom work"] },
    { step:"Higher writing demands", items:["Avoidance of writing tasks","Difficulty producing longer written work","Growing gap between ideas and ability to express them in writing"] },
  ],

  ripple: [
    { key:"learning", label:"Learning", angle:-90, text:"Slow or effortful handwriting can reduce the attention a child has left over for the ideas they're trying to put down, not just the letters themselves." },
    { key:"confidence", label:"Confidence", angle:-38, text:"Repeated difficulty with written tasks may affect a child's confidence and willingness to participate in class." },
    { key:"participation", label:"Participation", angle:14, text:"Children may start avoiding tasks or activities that involve a lot of handwriting." },
    { key:"homework", label:"Homework", angle:66, text:"Written homework can take considerably longer to complete, adding pressure at home as well as school." },
    { key:"exams", label:"Examinations", angle:118, text:"Timed, handwritten assessments can penalise slower writers regardless of how well they know the material." },
    { key:"communication", label:"Communication", angle:170, text:"Difficulty getting ideas onto paper can make it harder for a child's knowledge and thinking to be seen by others." },
    { key:"wellbeing", label:"Emotional wellbeing", angle:222, text:"Ongoing frustration with writing tasks may contribute to anxiety or a sense of falling behind peers." },
  ],

  approaches: [
    { title:"Educational approaches", involves:"Classroom accommodations, modified assignments, explicit handwriting instruction, extended time.", why:"Adjusts everyday demands so writing difficulty is less of a barrier to showing what a child knows.", limits:"Effectiveness depends heavily on teacher training and classroom resources.", status:"Widely used" },
    { title:"Occupational / therapeutic approaches", involves:"Fine motor and graphomotor exercises, therapist-led handwriting programs.", why:"Targets the underlying motor coordination and control involved in writing.", limits:"Requires access to a trained occupational therapist.", status:"Growing evidence base" },
    { title:"Technology-assisted approaches", involves:"Speech-to-text, keyboarding instruction, digital writing tools, assistive apps.", why:"Reduces the handwriting burden while still capturing a child's ideas.", limits:"Access to devices, software and training varies widely by setting.", status:"Promising, still maturing" },
    { title:"Multisensory approaches", involves:"Combining visual, tactile, auditory and kinesthetic input during letter practice.", why:"Reinforces letter formation through more than one sensory channel at once.", limits:"Time-intensive; effectiveness appears to vary by child.", status:"Long-standing practice" },
    { title:"Psychological / support approaches", involves:"Building confidence, reducing writing-related anxiety, structured encouragement.", why:"Addresses the emotional impact that can compound the original writing difficulty.", limits:"Rarely used alone; typically paired with other approaches.", status:"Under-researched in isolation" },
    { title:"Combined / multimodal approaches", involves:"Blending educational, therapeutic, technology-based and psychological support.", why:"Reflects that handwriting difficulty usually has more than one contributing factor.", limits:"Harder to implement consistently; needs coordination across adults.", status:"Increasingly emphasized" },
  ],

  pipeline: [
    { n:"01", label:"Child", body:"The starting point of the workflow — a child completes a short, standardized writing activity with an educator or researcher present." },
    { n:"02", label:"Standardized writing task", body:"A consistent task, such as copying a set sentence or shapes, so that samples can be compared fairly across children and over time." },
    { n:"03", label:"Handwriting capture", body:"The completed sample is captured as a digital image, by scanning or photographing it under consistent conditions." },
    { n:"04", label:"Image processing", body:"Raw handwriting is processed to isolate writing regions and reduce irrelevant visual information such as ruled lines or paper texture." },
    { n:"05", label:"Feature extraction", body:"Potentially useful characteristics can include spacing, size consistency, baseline variation, shape characteristics, and other measurable handwriting properties." },
    { n:"06", label:"Machine learning model", body:"A model analyzes the handwriting representation and estimates whether the sample is more consistent with the dataset's low-potential or potential-dysgraphia class." },
    { n:"07", label:"Risk / indicator profile", body:"Model output is translated into an interpretable screening profile — a set of indicators, not a diagnostic label." },
    { n:"08", label:"Human interpretation & follow-up", body:"A screening profile is only useful once a knowledgeable adult interprets it alongside everything else they know about the child, and decides on next steps." },
  ],

  demoTasks: [
    { key:"shapes", title:"Draw shapes", desc:"Basic pre-writing shapes and patterns." },
    { key:"letters", title:"Copy letters", desc:"A short, fixed set of individual letters." },
    { key:"words", title:"Copy words", desc:"A small set of standardized words." },
    { key:"sentence", title:"Copy sentence", desc:"One fixed sentence, copied from a prompt." },
    { key:"free", title:"Free writing", desc:"A short, open-ended writing sample." },
    { key:"timed", title:"Timed writing", desc:"A writing task completed under a time limit." },
  ],

  processingSteps: [
    "Preparing image",
    "Removing background noise",
    "Detecting writing region",
    "Extracting handwriting representation",
    "Running model",
    "Generating screening profile",
  ],

  modelFlow: [
    "Original handwriting scan","OpenCV preprocessing","Ruled-line removal","Word / fragment extraction",
    "Image normalization","CNN / transfer learning","Prediction","Screening profile",
  ],

  stageTabs: ["Original scan","Binary image","Lines removed","Word regions","Fragments"],

  datasetStats: [
    { num:"3,127", tag:"TOTAL HANDWRITING FRAGMENTS", desc:"Fragments extracted across the current research dataset." },
    { num:"64 × 128 × 1", tag:"IMAGE DIMENSIONS", desc:"Normalized grayscale fragment size used as model input." },
    { num:"2 classes", tag:"DATASET CLASSES", desc:"Low Potential Dysgraphia · Potential Dysgraphia." },
  ],

  splits: [
    { name:"Train", total:1876, pd:1051, lp:825 },
    { name:"Validation", total:625, pd:350, lp:275 },
    { name:"Test", total:626, pd:351, lp:275 },
  ],

  modelMetricsCNN: [
    { name:"Recall", val:0.694 }, { name:"Precision", val:0.790 }, { name:"F1 score", val:0.739 }, { name:"ROC-AUC", val:0.798 },
  ],
  modelMetricsMobileNet: [
    { name:"Recall", val:0.756 }, { name:"Precision", val:0.861 }, { name:"F1 score", val:0.805 }, { name:"ROC-AUC", val:0.868 },
  ],

  perfStats: [
    { num:"81%", tag:"ACCURACY (TEST)", desc:"Current experimental result on the held-out test split." },
    { num:"0.878", tag:"ROC-AUC (TEST)", desc:"Area under the ROC curve on the test split." },
    { num:"0.85 / 0.80", tag:"POTENTIAL DYSGRAPHIA — P / R", desc:"Precision and recall for the Potential Dysgraphia class." },
    { num:"0.76 / 0.81", tag:"LOW POTENTIAL — P / R", desc:"Precision and recall for the Low Potential class." },
  ],

  confusion: { tp:281, fn:70, fp:49, tn:226 },

  rocPoints: [[0,0],[0.02,0.30],[0.05,0.50],[0.1,0.65],[0.15,0.74],[0.2,0.80],[0.3,0.86],[0.4,0.90],[0.5,0.93],[0.6,0.95],[0.7,0.965],[0.8,0.978],[0.9,0.99],[1,1]],
  prPoints:  [[0,1],[0.1,0.96],[0.2,0.94],[0.3,0.92],[0.4,0.90],[0.5,0.88],[0.6,0.87],[0.7,0.85],[0.8,0.82],[0.9,0.78],[1.0,0.70]],

  thresholdTable: [
    { t:0.30, recall:0.93, precision:0.721, f1:0.812, pos:452 },
    { t:0.35, recall:0.90, precision:0.771, f1:0.831, pos:410 },
    { t:0.40, recall:0.86, precision:0.805, f1:0.832, pos:375 },
    { t:0.45, recall:0.83, precision:0.831, f1:0.830, pos:350 },
    { t:0.50, recall:0.80, precision:0.851, f1:0.825, pos:330 },
    { t:0.55, recall:0.75, precision:0.892, f1:0.815, pos:295 },
    { t:0.60, recall:0.70, precision:0.928, f1:0.798, pos:265 },
    { t:0.65, recall:0.63, precision:0.953, f1:0.759, pos:232 },
    { t:0.70, recall:0.56, precision:0.970, f1:0.710, pos:203 },
  ],

  explainTabs: ["Original","Heatmap","Overlay"],

  featureLab: [
    { name:"Letter size", scale:["Small","Medium","Large"], val:55 },
    { name:"Letter width", scale:["Narrow","Typical","Wide"], val:48 },
    { name:"Spacing", scale:["Compressed","Typical","Wide"], val:62 },
    { name:"Baseline deviation", scale:["Stable","Moderate","Variable"], val:70 },
    { name:"Slant", scale:["Left","Upright","Right"], val:58 },
    { name:"Stroke density", scale:["Sparse","Typical","Dense"], val:44 },
    { name:"Ink density", scale:["Light","Typical","Heavy"], val:50 },
    { name:"Character consistency", scale:["Variable","Typical","Consistent"], val:40 },
    { name:"Word spacing", scale:["Tight","Typical","Loose"], val:66 },
  ],

  roadmap: [
    { v:"V1", title:"Image-based screening prototype", obj:"Establish a working end-to-end pipeline from handwriting image to prediction.", tech:"OpenCV preprocessing + CNN / MobileNetV2 classification.", value:"Proves feasibility of the overall approach." , tags:["Current"]},
    { v:"V2", title:"Source / child-level data splitting", obj:"Ensure fragments from the same child never span both train and test.", tech:"Refactor the data pipeline around child identifiers, not fragment identifiers.", value:"Produces a trustworthy estimate of real-world performance.", tags:["Planned","High priority"] },
    { v:"V3", title:"Engineered handwriting features", obj:"Extract explicit, interpretable measurements from each sample.", tech:"Classical computer-vision feature engineering alongside the image model.", value:"Improves explainability of individual predictions.", tags:["Planned"] },
    { v:"V4", title:"Hybrid CNN + handwriting feature model", obj:"Combine image-based and engineered-feature predictions.", tech:"Multi-input model architecture merging both representations.", value:"Potential accuracy and robustness gains over either approach alone.", tags:["Research direction"] },
    { v:"V5", title:"Child-level risk aggregation", obj:"Move from fragment-level predictions to one profile per child.", tech:"Aggregate multiple task-level predictions per child (mean, variance, thresholded counts).", value:"Matches the real screening objective far more closely.", tags:["Research direction"] },
    { v:"V6", title:"Dynamic handwriting capture", obj:"Incorporate true pen-motion data, not only static images.", tech:"Digitizing tablet / stylus capture of velocity, pressure, and timing.", value:"Adds a data dimension static images cannot provide.", tags:["Future work"] },
    { v:"V7", title:"Prospective validation", obj:"Test the system on new, independent participants collected going forward.", tech:"Structured data collection protocol with professional-assessment ground truth.", value:"The step required before any real-world screening claim could be considered credible.", tags:["Future work"] },
  ],

  errorSamples: [
    { key:"fp", tag:"False positive", predicted:"Potential Dysgraphia", true:"Low Potential", prob:0.61, note:"A fast, confident writer whose natural slant and spacing pattern resembled the positive class closely enough to cross the threshold." },
    { key:"fn", tag:"False negative", predicted:"Low Potential", true:"Potential Dysgraphia", prob:0.42, note:"A shorter fragment offered fewer distinguishing characteristics for the model to weigh." },
    { key:"amb", tag:"Ambiguous", predicted:"Potential Dysgraphia", true:"—", prob:0.52, note:"Prediction sits close to the decision boundary — a case where human review adds the most value." },
    { key:"poor", tag:"Poor-quality image", predicted:"Low Potential", true:"—", prob:0.58, note:"Uneven lighting and scan artefacts reduced contrast between ink and page." },
    { key:"seg", tag:"Segmentation error", predicted:"Potential Dysgraphia", true:"—", prob:0.66, note:"Two adjacent words were merged into a single fragment during preprocessing." },
    { key:"style", tag:"Unusual writing style", predicted:"Potential Dysgraphia", true:"Low Potential", prob:0.59, note:"An unconventional but fluent personal writing style fell outside patterns the model had seen often." },
  ],

  limitations: [
    "It does not diagnose dysgraphia.",
    "Handwriting variation between children — and within the same child on different days — is normal.",
    "The current dataset is limited in size and in the diversity of children it represents.",
    "Dataset labels require careful interpretation and were not produced through independent clinical diagnosis.",
    "Image fragments are not independent children — several fragments can come from the same source.",
    "Static images cannot measure true pen pressure or writing dynamics.",
    "Model performance may not generalize to new populations, age groups, or handwriting systems.",
    "Cultural, educational, linguistic and writing-system differences may affect how the model performs.",
    "More independent participants are required before broader claims can be made.",
    "External clinical and professional validation would be required before any real-world deployment.",
  ],

  ethics: [
    { title:"Privacy", body:"Handwriting samples and any linked information are sensitive; they should be minimized, protected, and never shared beyond their intended use." },
    { title:"Consent", body:"Informed consent from a parent or guardian — and assent from the child where appropriate — should precede any real data collection." },
    { title:"Data minimization", body:"Only the information actually needed for screening should ever be requested or stored." },
    { title:"Child safety", body:"Every design decision should be evaluated for how it affects a child's safety, dignity, and wellbeing, not only model accuracy." },
    { title:"Human oversight", body:"A knowledgeable adult should always review and contextualize a screening result before it informs any decision." },
    { title:"Bias", body:"Models trained on limited or non-representative data can perform unevenly across different groups of children." },
    { title:"Fairness", body:"Screening tools should be evaluated for how consistently they perform across age, language, and background." },
    { title:"Explainability", body:"People affected by a screening result deserve an honest account of what the model did — and did not — actually measure." },
  ],

  faq: [
    { q:"What is dysgraphia?", a:"A term commonly used to describe persistent difficulty with handwriting and/or written expression. Terminology and diagnostic classification vary between professionals and regions." },
    { q:"Is dysgraphia the same as messy handwriting?", a:"No. Everyone's handwriting varies. Dysgraphia describes a persistent pattern of difficulty that can interfere with learning and everyday participation, not an occasional untidy page." },
    { q:"Can this system diagnose dysgraphia?", a:"No. WriteAble is a screening-support and research prototype. It never provides a medical diagnosis, and any result should be treated as a starting point for further conversation, not a conclusion." },
    { q:"What does the model analyze?", a:"In its current form, the model classifies cropped handwriting fragments directly from image data. It does not yet extract the individual handwriting features described in the Feature Lab — those are a planned addition." },
    { q:"What is a screening result?", a:"An interpretable profile — a category, a probability, and a plain-language explanation of what influenced it — intended to inform, not replace, a human decision." },
    { q:"Why does the model use handwriting fragments?", a:"Working with smaller, standardized fragments (rather than a full page) makes preprocessing and comparison more consistent across samples and writers." },
    { q:"How accurate is the model?", a:"On the current test split, the selected model reaches roughly 81% accuracy and a ROC-AUC of about 0.878 — current experimental results on a limited research dataset, not a measure of clinical accuracy." },
    { q:"Why is recall important?", a:"In this project's design, missing a potentially concerning sample (a false negative) is treated as more costly than flagging one for extra review (a false positive), so recall was weighted accordingly. This is a project design choice, not a clinical standard." },
    { q:"Why not use accuracy alone?", a:"Accuracy can look misleadingly good on an imbalanced dataset. Precision, recall, F1 and ROC-AUC together give a fuller picture of where a model succeeds and fails." },
    { q:"Can handwriting alone diagnose dysgraphia?", a:"No. A comprehensive assessment by a qualified professional typically draws on much more than handwriting samples alone." },
    { q:"What happens after a concerning screening result?", a:"The intended next step is a conversation with a parent, teacher, or relevant professional — not an automatic label or placement decision." },
    { q:"Can adults use the system?", a:"The current research dataset and framing focus on school-age children; the pipeline hasn't been evaluated for adult handwriting." },
    { q:"How is children's data protected?", a:"This prototype is built around data minimization and is not connected to a production data-storage backend. Any real deployment would require a full privacy, consent, and data-protection review before collecting data from children." },
    { q:"What are the current limitations?", a:"See the Limitations section for the full list — including dataset size, fragment independence, generalization, and the absence of external clinical validation." },
  ],

  sources: [
    { type:"Peer-reviewed study", year:"2022", title:"Handwriting fluency and the quality of primary grade students' writing", meta:"Skår, Lei, Graham, Aasen, Johansen & Kvistad — Reading and Writing, 35(2), 509–538", finding:"In a large primary-grade sample, handwriting fluency was an independent, statistically significant predictor of writing quality.", relevance:"Supports why handwriting mechanics can matter for written output more broadly, not only legibility.", url:"https://doi.org/10.1007/s11145-021-10185-y" },
    { type:"Cross-sectional study", year:"2023", title:"Lifetime prevalence of dysgraphia and associated family environment characteristics in primary schools", meta:"Abed, Abbas & Dawood — International Journal of Public Health Science, 12(3), 1243–1248", finding:"Cites a commonly used estimate of 7–15% among school-age children, and reports a 27% lifetime prevalence in its own 421-student sample in Iraq.", relevance:"Illustrates how widely prevalence estimates vary by definition, method and population.", url:"https://doi.org/10.11591/ijphs.v12i3.22526" },
    { type:"Scoping review", year:"2025", title:"AI-driven approaches for dysgraphia diagnosis using online and offline handwriting data", meta:"Fallah, ZandiyeVakili, Sajedi & Abdulhussain — PLOS ONE", finding:"Of 177 initial papers, 21 met inclusion criteria; CNN- and SVM-based models frequently exceeded 90% accuracy, alongside recurring challenges around dataset size and generalization.", relevance:"Directly contextualizes this project's machine-learning approach and its current limitations.", url:"https://doi.org/10.1371/journal.pone.0328722" },
    { type:"Scoping review", year:"2021–22", title:"A scoping review to map research on children with dysgraphia, their carers, and educators", meta:"Kalenjuk, Laletas, Subban & Wilson — Australian Journal of Learning Difficulties", finding:"Charted 77 studies and found handwriting, spelling and technology as recurring research themes, alongside low rates of internationally representative research.", relevance:"Frames dysgraphia as an under-researched area in need of broader, more representative study.", url:"https://doi.org/10.1080/19404158.2021.1999997" },
    { type:"Narrative review", year:"2025", title:"From Motor Skills to Digital Solutions: Developmental Dysgraphia Interventions over Two Decades", meta:"Han & Wang — Children, 12(5), 542", finding:"Reviewing 12 studies, technology-assisted and integrated interventions showed promising engagement and accessibility results, though scalability and long-term sustainability remain open questions.", relevance:"Informs the framing of the Interventions section and the case for combined approaches.", url:"https://doi.org/10.3390/children12050542" },
    { type:"Clinical review", year:"2020", title:"Disorder of written expression and dysgraphia: definition, diagnosis, and management", meta:"Chung, Patel & Nizami — Translational Pediatrics, 9(S1), S46–S54", finding:"Describes how dysgraphia is not a stand-alone DSM-5 diagnosis, and is most often captured under Specific Learning Disorder with impairment in written expression.", relevance:"Grounds this site's careful, non-diagnostic terminology.", url:"https://doi.org/10.21037/tp.2019.11.01" },
    { type:"Interventional study", year:"2019", title:"To develop an occupational therapy kit for handwriting skills in children with dysgraphia and study its efficacy", meta:"Verma, Begum & Kapoor — The Indian Journal of Occupational Therapy, 51(3), 85–89", finding:"A single-arm interventional study evaluating a purpose-built occupational therapy kit for handwriting skills.", relevance:"A concrete example of occupational-therapy intervention research referenced in the Interventions section.", url:"" },
  ],

  archFlowSystem: ["Frontend","Backend / API","Preprocessing pipeline","Machine learning model","Prediction service","Screening profile","Database / research storage"],
  archFlowTechnical: ["Image upload","OpenCV","TensorFlow / Keras","MobileNetV2","Prediction","Results"],

  stack: [
    { cat:"Data science & ML", items:[
      {n:"Python", s:"current"}, {n:"TensorFlow / Keras", s:"current"}, {n:"OpenCV", s:"current"}, {n:"scikit-learn", s:"current"}, {n:"NumPy / Pandas", s:"current"},
    ]},
    { cat:"Frontend (this prototype)", items:[
      {n:"HTML / CSS / JavaScript", s:"current"}, {n:"Chart.js", s:"current"}, {n:"React / Next.js + TypeScript", s:"planned"}, {n:"Tailwind CSS", s:"planned"},
    ]},
    { cat:"Backend & data", items:[
      {n:"FastAPI / Flask", s:"planned"}, {n:"PostgreSQL / MySQL", s:"planned"}, {n:"Prediction API service", s:"planned"},
    ]},
    { cat:"Charts & visualization", items:[
      {n:"Chart.js", s:"current"}, {n:"Custom SVG diagrams", s:"current"}, {n:"Recharts / Plotly", s:"planned"},
    ]},
  ],

  expLog: [
    { id:"001", name:"Custom CNN — baseline", split:"Fragment-level", status:"done" },
    { id:"002", name:"MobileNetV2 — transfer learning", split:"Fragment-level", status:"done" },
    { id:"003", name:"Source-level data split", split:"Child-level", status:"planned" },
    { id:"004", name:"Hybrid CNN + feature model", split:"Child-level", status:"planned" },
  ],

  presentation: [
    { kicker:"01 / 10", h:"Problem", pts:["Handwriting difficulty is common, under-recognised, and often mistaken for carelessness.","Traditional observation is subjective and inconsistent between observers.","Persistent difficulties can affect learning, confidence, and participation."] },
    { kicker:"02 / 10", h:"Why it matters", pts:["Writing is a core channel for showing what a child knows.","Effortful handwriting can crowd out attention for ideas and content.","Effects can ripple into homework, exams, and emotional wellbeing."] },
    { kicker:"03 / 10", h:"Research", pts:["Estimates of 7–15% are reported among school-age children in the literature.","A 2025 scoping review found only 21 of 177 AI-dysgraphia papers met inclusion criteria — the field is young.","Interventions are varied; combined approaches are increasingly emphasized."] },
    { kicker:"04 / 10", h:"Proposed solution", pts:["A standardized handwriting task, captured and processed consistently.","Machine learning to surface measurable characteristics at scale.","An interpretable screening profile — never a diagnosis — for a professional to review."] },
    { kicker:"05 / 10", h:"Data", pts:["3,127 handwriting fragments across two classes.","1,876 train / 625 validation / 626 test fragments.","Key limitation: fragments share sources, so splits must move to the child level."] },
    { kicker:"06 / 10", h:"Preprocessing", pts:["Binarization and removal of ruled notebook lines.","Morphological processing and dilation to find word-sized regions.","Contour detection, cropping, and filtering of noisy fragments."] },
    { kicker:"07 / 10", h:"Machine learning", pts:["Custom CNN baseline vs. MobileNetV2 transfer learning.","MobileNetV2 selected: higher recall, precision, F1 and ROC-AUC on validation.","Recall prioritized by design — missing a case is treated as costlier than a false alarm."] },
    { kicker:"08 / 10", h:"Results", pts:["Test accuracy ≈ 81%, ROC-AUC ≈ 0.878.","Potential Dysgraphia: precision 0.85, recall 0.80.","Current experimental results — not a measure of clinical performance."] },
    { kicker:"09 / 10", h:"Limitations", pts:["No diagnosis is made or implied at any point.","Dataset is limited in size, diversity, and independence between fragments.","Static images can't capture true writing dynamics like pressure or velocity."] },
    { kicker:"10 / 10", h:"Future work", pts:["Move from fragment-level to child-level, source-safe evaluation.","Add engineered handwriting features alongside image classification.","Explore dynamic, stylus-captured handwriting data."] },
  ],
};