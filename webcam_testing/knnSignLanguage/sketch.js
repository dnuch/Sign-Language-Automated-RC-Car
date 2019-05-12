/* KNN Classifier with mobileNet model */

let video;
// map of sign language name to number of examples
// and percentage classification info text elements
// infotexts = {'signLanguageName', [ '# Examples', '% classification' ]}
let infoTexts = new Map();

// experiment with changing k
const TOPK = 10;

// Create a KNN classifier
const knnClassifier = ml5.KNNClassifier();
let featureExtractor;
let training = false;

var letter_word = null;

function setup() {
  // Create a featureExtractor that can extract the already learned features from MobileNet
  featureExtractor = ml5.featureExtractor('MobileNet', modelReady);
  noCanvas();
  // Create a video element
  video = createCapture(VIDEO);
  // Append it to the videoContainer DOM element
  video.parent('videoContainer');
}

function modelReady(){
  // select('#status').html('FeatureExtractor(mobileNet model) Loaded');
  console.log('FeatureExtractor(mobileNet model) Loaded'); 
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
  console.log("added an example for " + label);
  updateCounts(label);
}

// Predict the current frame.
function classify() {
  // Get the total number of labels from knnClassifier
  const numLabels = knnClassifier.getNumLabels();

  if (numLabels <= 0) {
    console.error('There are no examples in any label');
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

// Update the example count for each label  
function updateCounts(label) {
  const counts = knnClassifier.getCountByLabel();
  if(label != null) {
    infoTexts.get(label)[0].innerText = `${(counts[label] || 0)} examples`;
  }
  else 
    console.log("Letter or word not selected"); 
}

function selectMenu(sign) {
  letter_word = sign;
  updateCounts(letter_word); 

}
// A util function to create UI buttons
function createButtons() {
  var div = document.getElementById("left");
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


  const breakText = document.createElement('br');
  div.appendChild(breakText);

    // Create training button
    const buttonTrain = document.createElement('button');
    buttonTrain.innerText =`Train`;
    div.appendChild(buttonTrain);

    // Create training button
    const buttonReset = document.createElement('button');
    buttonReset.innerText =`Reset`;
    div.appendChild(buttonReset);

    // Train and Reset Listeners
    buttonTrain.addEventListener('click', () => addExample(letter_word));
    buttonReset.addEventListener('click', () => clearLabel(letter_word));

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

  console.log("Buttons created")
  for (let sign of signs) {
    document.body.appendChild(div);
    div.style.marginBottom = '5px';

    //  Select Menu 
    var letterMenu = document.getElementById('LetterList'); 
    const opt = document.createElement('option');
    // opt.innerText =`Train ${sign}`;
    opt.innerText = sign;
    console.log(opt)
    letterMenu.appendChild(opt);

    // Listener for each option
    opt.addEventListener('click', () => selectMenu(sign)); 

    // Append to map
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

// Clear the examples in one label
function clearLabel(label) {
  knnClassifier.clearLabel(label);
  updateCounts(label);
}

// Clear all the examples in all labels
function clearAllLabels() {
  knnClassifier.clearAllLabels();
  updateCounts(letter_word);
}

// Save dataset locally
function saveMyKNN() {
  knnClassifier.save('sign_knn_dataset.json');
}

// Load dataset to the classifier
function loadMyKNN() {
  knnClassifier.load('../../sign_knn_dataset2.json', updateCounts(letter_word));
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
