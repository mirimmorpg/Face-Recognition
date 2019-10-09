const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
//overlay.src = "/overlay/Facescan_"

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
  faceapi.nets.faceExpressionNet.loadFromUri("/models")
]).then(startVideo);

async function startVideo() {
  const labeledFaceDescriptors = await loadLabeledImages();
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);

  const facingMode = "user";
  const constraints = {
    audio: false,
    video: {
      facingMode: facingMode
    }
  };
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(stream => (video.srcObject = stream), err => console.error(err));

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
        if (result.distance > 0.35 && result.label == "Götz") {
          overlay.src = "overlay/Facescan_02.png";
          console.log(result.distance);
        } else if (result.distance > 0.4 && result.label !== "unknown") {
          overlay.src = "overlay/Facescan_03.png";
          console.log(result.distance);
        } else {
          overlay.src = "overlay/Facescan_02.png";
        }
      });
    }, 1000);
  });
}

function loadLabeledImages() {
  const labels = ["Lars Heitmüller", "Götz", "Miriam"];
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
