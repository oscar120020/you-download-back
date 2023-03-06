const express = require("express");
const ytdl = require("ytdl-core");

const app = express();

app.get("/download", async (req, res) => {
  const videoUrl = req.query.videoUrl;
  const options = { quality: req.query.quality };
  const progressCallback = (event) => {
    console.log(`Downloaded ${event.loadedBytes} bytes of ${event.totalBytes}`);
  };

  const info = await ytdl.getInfo(videoUrl);

  const videoStream = ytdl.downloadFromInfo(info, options, progressCallback);
  res.setHeader("Content-Disposition", 'attachment; filename="video.mp4"');
  videoStream.pipe(res);
});

app.listen(5000, () => {
  console.log(`Servidor iniciado en el puerto ${5000}`);
});
