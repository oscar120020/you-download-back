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

    const miniatures = info.videoDetails.thumbnails;
    const title = info.videoDetails.title;
    const videoId = info.videoDetails.videoId;
    const lengthSeconds = mapSeconds(info.videoDetails.lengthSeconds);

    return res.json({
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
    ytdl(videoUrl, { quality: "highestaudio" }).pipe(res)
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
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    ytdl(videoUrl).pipe(res)
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

exports.module = app;
