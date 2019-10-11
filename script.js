const video = document.getElementById("video");
const overlay = document.getElementById("overlay");

const constraints = {
  audio: false,
  video: true
};

navigator.getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia ||
  navigator.msGetUserMedia;

function successCallback(stream) {
  video.srcObject = stream;
}

function errorCallback(error) {
  console.log("navigator.getUserMedia error: ", error);
}
navigator.mediaDevices
  .getUserMedia(constraints)
  .then(successCallback)
  .catch(errorCallback);

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("./models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("./models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("./models"),
  faceapi.nets.ssdMobilenetv1.loadFromUri("./models"),
  faceapi.nets.faceExpressionNet.loadFromUri("./models")
]).then(startVideo);

async function startVideo() {
  const labeledFaceDescriptors = await loadLabeledImages();
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);

  /*
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(stream => (video.srcObject = stream), err => console.error(err));
  if (window.webkitURL) {
    video.src = window.webkitURL.createObjectURL(stream);
  } else {
    video.src = stream;
  }*/

  video.addEventListener("play", () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);
    setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, resizedDetections);
      //faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
      //faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
      const results = resizedDetections.map(d =>
        faceMatcher.findBestMatch(d.descriptor)
      );
      results.forEach((result, i) => {
        const box = resizedDetections[i].detection.box;
        const drawBox = new faceapi.draw.DrawBox(box, {
          label: result.toString()
        });
        drawBox.draw(canvas);
        if (result.distance > 0.35 && result.label == "Goetz") {
          overlay.src = "overlay/Facescan_04.png";
        } else if (result.distance > 0.4 && result.label !== "unknown") {
          overlay.src = "overlay/Facescan_03.png";
        } else if (result.distance > 0.6 && result.label == "unknown") {
          overlay.src = "overlay/Facescan_02.png";
        } else {
          overlay.src = "overlay/Facescan_01.png";
        }
      });
    }, 1000);
  });
}

function loadLabeledImages() {
  const labels = ["Lars", "Goetz", "Miriam"];
  return Promise.all(
    labels.map(async label => {
      const descriptions = [];
      for (let i = 1; i <= 6; i++) {
        const img = await faceapi.fetchImage(
          `./labeled_images/${label}/${i}.jpg`
        );
        const detections = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();
        descriptions.push(detections.descriptor);
      }

      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
}
