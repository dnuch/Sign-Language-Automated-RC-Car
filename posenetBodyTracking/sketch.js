// Init PoseNet
// -----------------

let img;
// Create a KNN classifier
const TOPK = 7;
// map of sign language name to number of examples
// and percentage classification info text elements
// infotexts = {'signLanguageName', [ '# Examples', '% classification' ]}
let infoTexts = new Map();
const knnClassifier = ml5.KNNClassifier();
let poseNet;
let poses = [];
var runClassifier = false;

// Pi's network address
let piAddress = '10.252.120.235';

function setup() {
    setupROS();
    console.log(`k = ${TOPK}`);
    createCanvas(640, 480);

    // create an image using the p5 dom library
    // call modelReady() when it is loaded
    img = createImg('http://' + piAddress + ':8080/stream?topic=/cv_camera/image_raw', imageReady);
    // set the image size to the size of the canvas
    img.size(width, height);

    img.hide(); // hide the image in the browser
    frameRate(60); // set the frameRate to 1 since we don't need it to be running quickly in this case
}

function processPoseNet(results) {
    poses = results;
    console.log(poses[0].poseWithParts.score);
    // keep drawing on multiple images
    if (poses[0].poseWithParts.score > 0.30) {
        runClassifier = true;
    } else {
        runClassifier = false;
    }
    poseNet.singlePose(img);
}

// when the image is ready, then load up poseNet
function imageReady() {
    createButtons();

    const options = {
        imageScaleFactor: 0.3,
        outputStride: 16,
        flipHorizontal: false,
        minConfidence: 0.9,
        maxPoseDetections: 1,
        scoreThreshold: 0.9,
        nmsRadius: 20,
        detectionType: 'single',
        // detectionType: 'multiple',
        multiplier: 0.75
    };

    // assign poseNet
    poseNet = ml5.poseNet(modelReady, options);
    // This sets up an event that listens to 'pose' events
    poseNet.on('pose', function (results) {
        processPoseNet(results);
    });
}

// Add the current frame from the video to the classifier
function addExample(label) {
    // Convert poses keypoints results to a 2d array [[score0, x0, y0],...,[score16, x16, y16]]
    const poseArray = poses[0].poseWithParts.keypoints.map(p => [p.score, p.position.x, p.position.y]);

    // Add an example with a label to the classifier
    knnClassifier.addExample(poseArray, label);
    updateCounts();
}

// when poseNet is ready, do the detection
function modelReady() {
    select('#status').html('Model Loaded');

    // When the model is ready, run the singlePose() function...
    // If/When a pose is detected, poseNet.on('pose', ...) will be listening for the detection results
    // in the draw() loop, if there are any poses, then carry out the draw commands
    poseNet.singlePose(img)
}

// Predict the current frame.
function classify() {
    if (runClassifier) {
        // Get the total number of labels from knnClassifier
        console.log('classifier run');
        const numLabels = knnClassifier.getNumLabels();
        if (numLabels <= 0) {
            console.error('There is no examples in any label');
            return;
        }
        // Convert poses results to a 2d array [[score0, x0, y0],...,[score16, x16, y16]]
        const poseArray = poses[0].poseWithParts.keypoints.map(p => [p.score, p.position.x, p.position.y]);

        // Use knnClassifier to classify which label do these features belong to
        // You can pass in a callback function `gotResults` to knnClassifier.classify function
        knnClassifier.classify(poseArray, TOPK, gotResults);
    } else {
        setTimeout(() => {
            classify();
            sendTwist();
            isReversing = false;
        }, 100);

    }
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

    for (let pose of _poses) {
        div = document.createElement('div');
        document.body.appendChild(div);
        div.style.marginBottom = '5px';

        // Create training button
        const buttonTrain = document.createElement('button');
        buttonTrain.innerText =`Train ${pose}`;
        div.appendChild(buttonTrain);

        // Listen for mouse events when clicking the button
        buttonTrain.addEventListener('click', () => addExample(pose));

        // Create training button
        const buttonReset = document.createElement('button');
        buttonReset.innerText =`Reset ${pose}`;
        div.appendChild(buttonReset);

        // Listen for mouse events when clicking the button
        buttonReset.addEventListener('click', () => clearLabel(pose));

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
        infoTexts.set(pose, [
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

            sendTwistOnConfidence(confidences);
        }

        for (let pose of _poses) {
            infoTexts.get(pose)[1].innerText = `${confidences[pose] ? confidences[pose] * 100 : 0} %`;
        }
    }

    classify();
}

// Update the example count for each label
function updateCounts() {
    const counts = knnClassifier.getCountByLabel();

    for (let pose of _poses) {
        infoTexts.get(pose)[0].innerText = `${(counts[pose] || 0)} examples`;
    }
}

// Clear the examples in one label
function clearLabel(classLabel) {
    knnClassifier.clearLabel(classLabel);
    updateCounts();
}

// Clear all the examples in all labels
function clearAllLabels() {
    knnClassifier.clearAllLabels();
    updateCounts();
}

// Save dataset locally
function saveMyKNN() {
    knnClassifier.save('pose_knn_dataset.json');
}

// Load dataset to the classifier
function loadMyKNN() {
    knnClassifier.load('./pose_knn_dataset.json', updateCounts);
}

// draw() will not show anything until poses are found
function draw() {
    if (poses.length > 0) {
        image(img, 0, 0, width, height);
        drawSkeleton(poses);
        drawKeypoints(poses);
    }
}

// A function to draw ellipses over the detected keypoints
function drawKeypoints()  {
    // Loop through all the poses detected
    for (let i = 0; i < poses.length; i++) {
        // For each pose detected, loop through all the keypoints
        let pose = poses[i].poseWithParts;
        for (let j = 0; j < pose.keypoints.length; j++) {
            // A keypoint is an object describing a body part (like rightArm or leftShoulder)
            let keypoint = pose.keypoints[j];
            // Only draw an ellipse is the pose probability is bigger than 0.2
            if (keypoint.score > 0.2) {
                fill(255, 0, 0);
                noStroke();
                ellipse(keypoint.position.x, keypoint.position.y, 10, 10);
            }
        }
    }
}

// A function to draw the skeletons
function drawSkeleton() {
    // Loop through all the skeletons detected
    for (let i = 0; i < poses.length; i++) {
        let skeleton = poses[i].skeleton;
        // For every skeleton, loop through all body connections
        for (let j = 0; j < skeleton.length; j++) {
            let partA = skeleton[j][0];
            let partB = skeleton[j][1];
            stroke(255, 255, 255);
            line(partA.position.x, partA.position.y, partB.position.x, partB.position.y);
        }
    }
}

// Init Connection to ROS
// -----------------

let ros;
let cmdVel;
// -1.0 to 1.0 values
// const FORWARD = 0.55;
// const BACKWARD = -0.6;
const FORWARD = 0.46;
const MAX_FORWARD = FORWARD + 0.05;
const BACKWARD = -0.50;
const MAX_BACKWARD = BACKWARD - 0.05;
const LEFT = 1.0;
const MIDLEFT = LEFT - 0.3;

const RIGHT = -1.0;

const MIDRIGHT = RIGHT + 0.3;

function setupROS() {
    ros = new ROSLIB.Ros({
        url : 'ws://10.252.120.235:9090'
    });

    ros.on('connection', function() {
        console.log('Connected to websocket server.');
    });

    ros.on('error', function(error) {
        console.log('Error connecting to websocket server: ', error);
    });

    ros.on('close', function() {
        console.log('Connection to websocket server closed.');
    });

// Publishing a Topic
// ------------------

    cmdVel = new ROSLIB.Topic({
        ros : ros,
        name : '/cmd_vel',
        messageType : 'geometry_msgs/Twist'
    });

    // init();
}

function sendTwist(linearX = 0.0, angularZ = 0.0) {
    const twist = new ROSLIB.Message({
        linear : {
            x : linearX,
            y : 0.0,
            z : 0.0
        },
        angular : {
            x : 0.0,
            y : 0.0,
            z : angularZ
        }
    });

    cmdVel.publish(twist);
}

// to reverse the RC car, the signals must be
// sent in following order: backward -> idle -> backward
function sendBackwardTwist(linearX = BACKWARD, angularZ = 0.0) {
    sendTwist(linearX, angularZ);
    sendTwist();
    sendTwist(linearX, angularZ);

    sendTwist(linearX, angularZ);
    sendTwist();
    sendTwist(linearX, angularZ);
    // setTimeout(() => sendTwist(BACKWARD, angularZ), 100 + timeoutOffset);
    // setTimeout(() => sendTwist(), 200 + timeoutOffset);
    // setTimeout(() => sendTwist(BACKWARD), 300 + timeoutOffset);
}

function init() {
    console.log('init');

    sendTwist(FORWARD);

    setTimeout(() => sendTwist(), 900);

    // sendBackwardTwist(1100);
    sendBackwardTwist();
    setTimeout(() => sendTwist(), 2000);

    setTimeout(() => sendTwist(0.0, RIGHT), 3000);
    setTimeout(() => sendTwist(0.0, LEFT), 4000);
    setTimeout(() => sendTwist(), 5000);
}

let isReversing = false;
function sendTwistOnConfidence(confidences) {
    /*************Moving positions****************/


    if (confidences['idle_B3C3'] > 0.9 || confidences['noPose'] > 0.9) {
        sendTwist();
        isReversing = false;
    }

    if (confidences['idleLeft_A3B3'] > 0.9) {
        sendTwist();
        isReversing = false;
    }

    if (confidences['idleRight_C3D3'] > 0.9) {
        sendTwist();
        isReversing = false;
    }

    if (confidences['forwardMiddleUp_B4C4'] > 0.9) {
        sendTwist(FORWARD);
        isReversing = false;
    }

    if (confidences['forwardMiddleUpLeft_A4B4'] > 0.9) {
        sendTwist(FORWARD, MIDLEFT);
        isReversing = false;
    }

    if (confidences['forwardMiddleUpRight_C4D4'] > 0.9) {
        sendTwist(FORWARD, MIDRIGHT);
        isReversing = false;
    }

    if (confidences['forwardUp_B5C5'] > 0.9) {
        sendTwist(MAX_FORWARD);
        isReversing = false;
    }

    if (confidences['forwardUpLeft_A5B5'] > 0.9) {
        sendTwist(MAX_FORWARD, LEFT);
        isReversing = false;
    }

    if (confidences['forwardUpRight_C5D5'] > 0.9) {
        sendTwist(MAX_FORWARD, RIGHT);
        isReversing = false;
    }

    if (confidences['backwardMiddleDown_B2C2'] > 0.9) {
        if (isReversing) sendTwist(BACKWARD);
        else {
            isReversing = true;
            sendBackwardTwist();
        }
    }

    if (confidences['backwardMiddleDownLeft_A2B2'] > 0.9) {
        if (isReversing) sendTwist(BACKWARD, MIDRIGHT);
        else {
            isReversing = true;
            sendBackwardTwist(BACKWARD, MIDRIGHT);
        }
    }

    if (confidences['backwardMiddleDownRight_C2D2'] > 0.9) {
        if (isReversing) sendTwist(BACKWARD, MIDLEFT);
        else {
            isReversing = true;
            sendBackwardTwist(BACKWARD, MIDLEFT);
        }
    }

    if (confidences['backwardDown_B1C1'] > 0.9) {
        if (isReversing) sendTwist(MAX_BACKWARD);
        else {
            isReversing = true;
            sendBackwardTwist(MAX_BACKWARD);
        }
    }

    if (confidences['backwardDownLeft_A1B1'] > 0.9) {
        if (isReversing) sendTwist(MAX_BACKWARD, RIGHT);
        else {
            isReversing = true;
            sendBackwardTwist(MAX_BACKWARD, RIGHT);
        }
    }

    if (confidences['backwardDownRight_C1D1'] > 0.9) {
        if (isReversing) sendTwist(MAX_BACKWARD, LEFT);
        else {
            isReversing = true;
            sendBackwardTwist(MAX_BACKWARD, LEFT);
        }
    }
}

const _poses = [
    // stationary poses control robot
    'noPose',

    /*
      A5| backward_L_Up  | backward_Up   | backward_L_Up  |D5
        | backward_MR_Up | backward_M_Up | backward_ML_Up |
        | idle_right     | idle          | idle_left      |
        | forward_MR_Up  | forward_M_Up  | forward_ML_Up  |
      A1| forward_R_Up   | forward_Up    | forward_L_Up   |D1

                                car
     */

    // position on camera control robot
    'idle_B3C3',
    'idleLeft_A3B3',
    'idleRight_C3D3',

    'forwardMiddleUp_B4C4',
    'forwardMiddleUpLeft_A4B4',
    'forwardMiddleUpRight_C4D4',

    'forwardUp_B5C5',
    'forwardUpLeft_A5B5',
    'forwardUpRight_C5D5',

    'backwardMiddleDown_B2C2',
    'backwardMiddleDownLeft_A2B2',
    'backwardMiddleDownRight_C2D2',

    'backwardDown_B1C1',
    'backwardDownLeft_A1B1',
    'backwardDownRight_C1D1'
];
