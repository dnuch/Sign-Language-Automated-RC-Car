# Sign Language Companion Translator
##### An overview of the respository structure:
- **ROS** - contains folders of nodes with files corresponding to source, launch, message, and service files 
  - **donkey_llc**- The Pi's low level control node that converts a `Geometry/twist` message posted in `/cmd_vel` node to a `/servos_absolute` message retrieved by `i2cpwm_board_node`.  The execution of `keyboard_demo.launch` file initializes this node and the `i2cpwm_board` node.
  - **ros-i2cpwmboard** -  The project where the i2cpwm_board controller node is located.  This node interfaces with the [PCA9685 I2C 16-Channel 12-bit PWM/Servo Driver](https://www.amazon.com/gp/product/B01G61MZF4/ref=as_li_qf_asin_il_tl?ie=UTF8&tag=tizianoslab-20&creative=9325&linkCode=as2&creativeASIN=B01G61MZF4&linkId=1179856ce06b25cbf85ad9aaeae25201).  Visit http://bradanlane.gitlab.io/ros-i2cpwmboard/ for more information regarding this node.
- **images** - contains an image of how the ROS nodes look like
- **knnSignLanguage** - Sign Language Detection Website running MobileNet CNN and KNN classification.  The images are retrieved from a website locally hosted by the Raspberry Pi on the same network as the Laptop retrieving it.  The dataset we manually trained is `sign_knn_dataset.json`.  `sketch.js` file contains the source of the code (change variable `piAddress` to the correct Raspberry Pi's local network address).

 Demo Video: https://youtu.be/iocofPDwVtI

- **posenetBodyTracking** - Body Tracking Website running PoseNet CNN and KNN classification.  The images are retrieved from a website locally hosted by the Raspberry Pi on the same network as the Laptop retrieving it.   The dataset we manually trained is `pose_knn_dataset.json`.  `sketch.js` file contains the source of the code (change variable `piAddress` to the correct Raspberry Pi's local network address).

 Demo Video: https://youtu.be/Rq0uuOhgO7U
 
- **scripts**
  - `chrome_security.bat` is a Windows script that runs chrome in developer mode with web security (CORS) disabled which is required to retrieve images externally from Chrome (in our case, the retrieval of images from the Pi).  
  - `pythonhttpserver.bat` is a Windows script that creates a locally hosted website on the directory it is executed on.
- **webcam_testing/knnSignLanguage** - Very much like the knnSignLanguage directory above but instead retrieves images through the laptop's webcam (Allowing training/testing without the need for the Companion car).
##### Prerequisites to get started:
- **RC Car**
  - The [donkey car tutorial](https://docs.donkeycar.com/guide/build_hardware/) is followed to get a quick car running with a Raspberry Pi 3b+ and I2C PWM/Servo driver mounted on top .  Follow this tutorial thoroughly to obtain a project at the cost of less than ~$200 (ideally you should 3D print your own parts, otherwise you can buy it in this website too).
- **Raspberry Pi 3b+ Setup**
  1. Raspberry Pi 3b+ is required since we will be using the [Ubiquity Robotics Image](https://downloads.ubiquityrobotics.com/pi.html) which has ROS Kinetic Kame preinstalled.  Upload this image to the Pi and follow this [tutorial](https://learn.ubiquityrobotics.com/) to setup the network connection that is one the same network as the laptop you will be using for SSH.
  2. When you are able to successfully SSH into the Pi, we must now setup the  ROS nodes.  Get comfortable with the ROS middleware file structure by going through these [tutorials](http://wiki.ros.org/ROS/Tutorials).
      - Now implement the `donkey_llc` and `ros-i2cpwmboard` nodes from this directory into your ROS workspace (this will allow execution of `keyboard_demo` launch file)
      - Additional nodes to install:
        - [teleop_twist_keyboard](http://wiki.ros.org/teleop_twist_keyboard)
        - [web_video_server](http://wiki.ros.org/web_video_server)
        - [cv-camera](http://wiki.ros.org/cv_camera)
        - [rosbridge-server](http://wiki.ros.org/rosbridge_server)

- **Laptop** - capable of running locally hosted websites utilizing Tensorflow.js CNNs (PoseNet & MobileNet).  Create a folder called companion_car_websites and drag posenetBodyTracking and knnSignLanguage directories into this folder.  If running on windows then simply copy the scripts from the scripts directory into this directory.  If not on windows, find a way to disable CORS for the browser you intend to host the websites on.
##### Running the project
1. Open 5 terminals and SSH into the Raspberry Pi.
    - For every terminal run these commands seperately:
      - `roslaunch donkey_llc keyboard_demo.launch`
      - `rosrun teleop_twist_keyboard teleop_twist_keyboard.py _speed:=0.55`
      - `rosrun cv_camera cv_camera_node`
      - `rosrun web_video_server web_video_server`
      - `roslaunch rosbridge_server rosbridge_websocket.launch`
2.  Turn on the motor of the companion car.
3.  On a Windows hosted laptop, run both of the batch scripts and open two tabs and enter `localhost:8000` in the address of the web browser with CORS disabled.  Click the respective directories to access the websites and check to see if the video feed is coming from the Rasberry Pi (you will have to edit the source files with the correct Pi's local network address).  Click `Load Classifier` button (or train your own classifiers) and start predicting on both websites to see sign language and body detection KNN classification.  The motors will respond depending on the position of the person.
