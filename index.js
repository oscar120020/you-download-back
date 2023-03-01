const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const express = require("express");
const ytdl = require("ytdl-core");
const ffmpeg = require("ffmpeg-static");
const cors = require("cors");

require("dotenv").config();

const app = express();
app.use(cors());

const mapSeconds = (seconds) => {
  const res = Number(seconds) / 60;

  if (!res.toString().includes(".")) {
    return `${res}:00`;
  }

  let int = res.toString().split(".")[0];
  let residuo = (Number(seconds) % 60).toString();

  if (residuo.length === 1) {
    residuo = `0${residuo}`;
  }

  return `${int}:${residuo}`;
};

// OBTENER LOS FORMATOS DISPONIBLES DEL VIDEO
app.get("/video-formats", async (req, res) => {
  const videoURL = req.query.videoURL; // ID del video de YouTube
  // const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const info = await ytdl.getInfo(videoURL);

    let formats = info.formats
      .map((format) => format.qualityLabel)
      .filter((f) => f !== null);
    let results = [];
    for (let f of formats) {
      if (!results.includes(f)) {
        results.push(f);
      }
    }

    const miniatures = info.videoDetails.thumbnails;
    const title = info.videoDetails.title;
    const videoId = info.videoDetails.videoId;
    const lengthSeconds = mapSeconds(info.videoDetails.lengthSeconds);

    return res.json({
      formats: results,
      miniatures,
      title,
      videoId,
      lengthSeconds,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      message: "No se pudo obtener la información del video",
    });
  }
});

// DESCARGAR EL AUDIO DE UN VIDEO DE YOUTUBE
app.get("/download/audio", async (req, res) => {
  const videoId = req.query.videoId; // ID del video de YouTube
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const info = await ytdl.getInfo(videoUrl);
    const audioStream = ytdl(videoUrl, { quality: "highestaudio" });

    // create folder to storage the video
    const audioPath = path.join(
      __dirname,
      (Math.random() + 1).toString(36).substring(5)
    );
    fs.mkdirSync(audioPath);

    // create the ffmpeg process for muxing
    let ffmpegProcess = cp.spawn(
      ffmpeg,
      [
        // supress non-crucial messages
        "-loglevel",
        "8",
        "-hide_banner",
        // input audio and video by pipe
        "-i",
        "pipe:3",
        // map audio and video correspondingly
        "-map",
        "0:a",
        // no need to change the codec
        "-c:v",
        "copy",
        // output mp4
        `${path.join(audioPath, "out.mp3")}`,
      ],
      {
        // no popup window for Windows users
        windowsHide: true,
        stdio: [
          // silence stdin/out, forward stderr,
          "inherit",
          "inherit",
          "inherit",
          // and pipe audio, output
          "pipe",
          "pipe",
        ],
      }
    );

    // Capturar los errores de ffmpeg
    ffmpegProcess.on("error", (error) => {
      console.error("FFmpeg error:", error);
    });

    // Catch when video is done
    ffmpegProcess.on("close", (code, signal) => {
      console.log(
        `FFmpeg process closed with code ${code} and signal ${signal}`
      );
      if (code === 0) {
        // Send video
        res.sendFile(path.join(audioPath, "out.mp3"));

        // Delete temp folder
        setTimeout(() => {
          fs.rmSync(audioPath, { recursive: true, force: true });
        }, 2000);
      }
    });

    // Register audio stream with ffmpeg
    audioStream.pipe(ffmpegProcess.stdio[3]);
  } catch (error) {
    console.log(error);
    res.status(400).json({
      message: "No se pudo descargar el audio del video",
    });
  }
});

// DESCARGAR VIDEO DE YOUTUBE
app.get("/download/video", async (req, res) => {
  const videoId = req.query.videoId; // ID del video de YouTube
  const videoformat = req.query.format; // ID del video de YouTube
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    // get video info
    const info = await ytdl.getInfo(videoUrl);

    // create video and audio streams
    let videoStream = ytdl.downloadFromInfo(info, {
      filter: (format) => format.qualityLabel === videoformat,
    });
    let audioStream = ytdl.downloadFromInfo(info, { quality: "highestaudio" });

    // create folder to storage the video
    const videoPath = path.join(
      __dirname,
      (Math.random() + 1).toString(36).substring(5)
    );
    fs.mkdirSync(videoPath);

    // create the ffmpeg process for muxing
    let ffmpegProcess = cp.spawn(
      ffmpeg,
      [
        // supress non-crucial messages
        "-loglevel",
        "8",
        "-hide_banner",
        // input audio and video by pipe
        "-i",
        "pipe:3",
        "-i",
        "pipe:4",
        // map audio and video correspondingly
        "-map",
        "0:a",
        "-map",
        "1:v",
        // no need to change the codec
        "-c:v",
        "copy",
        // output mp4
        `${path.join(videoPath, "out.mp4")}`,
      ],
      {
        // no popup window for Windows users
        windowsHide: true,
        stdio: [
          // silence stdin/out, forward stderr,
          "inherit",
          "inherit",
          "inherit",
          // and pipe audio, video, output
          "pipe",
          "pipe",
          "pipe",
        ],
      }
    );

    // Capturar los errores de ffmpeg
    ffmpegProcess.on("error", (error) => {
      console.error("FFmpeg error:", error);
    });

    // Catch when video is done
    ffmpegProcess.on("close", (code, signal) => {
      console.log(
        `FFmpeg process closed with code ${code} and signal ${signal}`
      );
      if (code === 0) {
        // Send video
        res.sendFile(path.join(videoPath, "out.mp4"));

        // Delete temp folder
        setTimeout(() => {
          fs.rmSync(videoPath, { recursive: true, force: true });
        }, 2000);
      }
    });

    // Register video and audio stream with ffmpeg
    audioStream.pipe(ffmpegProcess.stdio[3]);
    videoStream.pipe(ffmpegProcess.stdio[4]);
  } catch (error) {
    console.log(error);
    res.status(400).json({
      message: "No se pudo descargar el video",
    });
  }
});

const port = process.env.PORT;

app.listen(port, () => {
  console.log(`Servidor iniciado en el puerto ${port}`);
});
