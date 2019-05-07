/* KNN Classifier with mobileNet model */

let video;
// map of sign language name to number of examples
// and percentage classification info text elements
// infotexts = {'signLanguageName', [ '# Examples', '% classification' ]}
let infoTexts = new Map();

// experiment with changing k
const TOPK = 15;

// Create a KNN classifier
const knnClassifier = ml5.KNNClassifier();
let featureExtractor;

function setup() {
  console.log(`k = ${TOPK}`);
  // Create a featureExtractor that can extract the already learned features from MobileNet
  featureExtractor = ml5.featureExtractor('MobileNet', modelReady);
  noCanvas();
}

function modelReady(){
  select('#status').html('FeatureExtractor(mobileNet model) Loaded');
  setupVideo();
  // Create the UI buttons
  createButtons();
}

// Add the current frame from the video to the classifier
function addExample(label) {
  // Get the features of the input video
  const features = featureExtractor.infer(video);
  // You can also pass in an optional endpoint, defaut to 'conv_preds'
  // const features = featureExtractor.infer(video, 'conv_preds');
  // You can list all the endpoints by calling the following function
  // console.log('All endpoints: ', featureExtractor.mobilenet.endpoints)

  // Add an example with a label to the classifier
  knnClassifier.addExample(features, label);
  updateCounts();
}

// Predict the current frame.
function classify() {
  // Get the total number of labels from knnClassifier
  const numLabels = knnClassifier.getNumLabels();
  if (numLabels <= 0) {
    console.error('There is no examples in any label');
    return;
  }
  // Get the features of the input video
  const features = featureExtractor.infer(video);

  // Use knnClassifier to classify which label do these features belong to
  // You can pass in a callback function `gotResults` to knnClassifier.classify function
  knnClassifier.classify(features, TOPK, gotResults);
  // You can also pass in an optional K value, K default to 3
  // knnClassifier.classify(features, 3, gotResults);

  // You can also use the following async/await function to call knnClassifier.classify
  // Remember to add `async` before `function predictClass()`
  // const res = await knnClassifier.classify(features);
  // gotResults(null, res);
}

function setupVideo() {
    // Create a video element
    video = document.getElementById('video');
    video.src = 'http://10.252.120.235:8080/stream?topic=/cv_camera/image_raw';
    // video.src = 'http://10.252.120.235:8080/snapshot?topic=/cv_camera/image_raw';

    // Append it to the videoContainer DOM element
    // video.parent('video');
    video.onload = function() {
        console.log('video rdy')
    };
}

// A util function to create UI buttons
function createButtons() {
  let div = document.createElement('div');
  document.body.appendChild(div);
  div.style.marginBottom = '5px';
  // Predict button
  const buttonPredict = document.createElement('button');
  buttonPredict.innerText = 'Start Predicting';
  div.appendChild(buttonPredict);
  buttonPredict.addEventListener('click', () => classify());

  // Clear all classes button
  const buttonClearAll = document.createElement('button');
  buttonClearAll.innerText = 'Clear All Classifiers';
  div.appendChild(buttonClearAll);
  buttonClearAll.addEventListener('click', () => clearAllLabels());

  // Load saved classifier dataset
  const buttonSetData = document.createElement('button');
  buttonSetData.innerText = 'Load Classifier File';
  div.appendChild(buttonSetData);
  buttonSetData.addEventListener('click', () => loadMyKNN());

  // Get classifier dataset
  const buttonGetData = document.createElement('button');
  buttonGetData.innerText = 'Save Classifier File';
  div.appendChild(buttonGetData);
  buttonGetData.addEventListener('click', () => saveMyKNN());

  // When a training button is pressed, add the current frame
  // from the video with a label of `sign` to the classifier
  // Reset buttons implemented
  for (let sign of signs) {
    div = document.createElement('div');
    document.body.appendChild(div);
    div.style.marginBottom = '5px';

    // Create training button
    const buttonTrain = document.createElement('button');
    buttonTrain.innerText =`Train ${sign}`;
    div.appendChild(buttonTrain);

    // Listen for mouse events when clicking the button
    buttonTrain.addEventListener('click', () => addExample(sign));

    // Create training button
    const buttonReset = document.createElement('button');
    buttonReset.innerText =`Reset ${sign}`;
    div.appendChild(buttonReset);

    // Listen for mouse events when clicking the button
    buttonReset.addEventListener('click', () => clearLabel(sign));

    // Create example info text
    const infoExampleText = document.createElement('span');
    infoExampleText.innerText = ' No examples added';
    div.appendChild(infoExampleText);

    // Create text divider
    const dividerText = document.createElement('span');
    dividerText.innerText = ' | ';
    div.appendChild(dividerText);

    // Create percent classification info text
    const infoClassificationText = document.createElement('span');
    infoClassificationText.innerText = '0% Classification';
    div.appendChild(infoClassificationText);

    // append to map
    infoTexts.set(sign, [
      infoExampleText,
      infoClassificationText
    ]);
  }
}

// Show the results
function gotResults(err, result) {
  // Display any error
  if (err) {
    console.error(err);
  }

  if (result.confidencesByLabel) {
    const confidences = result.confidencesByLabel;
    // result.label is the label that has the highest confidence
    if (result.label) {
      select('#result').html(result.label);
      select('#confidence').html(`${confidences[result.label] * 100} %`);
    }

    for (let sign of signs) {
      infoTexts.get(sign)[1].innerText = `${confidences[sign] ? confidences[sign] * 100 : 0} %`;
    }
  }

  classify();
}

// Update the example count for each label	
function updateCounts() {
  const counts = knnClassifier.getCountByLabel();
  for (let sign of signs) {
    infoTexts.get(sign)[0].innerText = `${(counts[sign] || 0)} examples`;
  }
}

// Clear the examples in one label
function clearLabel(label) {
  knnClassifier.clearLabel(label);
  updateCounts();
}

// Clear all the examples in all labels
function clearAllLabels() {
  knnClassifier.clearAllLabels();
  updateCounts();
}

// Save dataset locally
function saveMyKNN() {
  knnClassifier.save('sign_knn_dataset.json');
}

// Load dataset to the classifier
function loadMyKNN() {
  knnClassifier.load('./sign_knn_dataset.json', updateCounts);
}

const signs = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z',
    'Hi',
    'Bye',
    'Cup',
    'Walk',
    'Sleep',
    'Book',
    'Ball',
    'Give',
    'Where',
    'Which',
    'Please',
    'Sorry',
    'Thank you',
    'Good',
    'Morning',
    'Afternoon'
];
