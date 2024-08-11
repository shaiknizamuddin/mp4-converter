const express = require("express");
const hbjs = require("handbrake-js");
const fs = require("fs").promises;
const path = require("path");

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware to handle JSON requests
app.use(express.json());

// Convert MXF to MP4 using HandBrake.js
function convertMxfToMp4(inputFilePath, outputFilePath) {
  return new Promise((resolve, reject) => {
    hbjs
      .spawn({
        input: inputFilePath,
        output: outputFilePath,
      })
      .on("error", (err) => {
        console.error("Error:", err);
        reject(err);
      })
      .on("progress", (progress) => {
        console.log(
          `Percent complete: ${progress.percentComplete}, ETA: ${progress.eta}`
        );
      })
      .on("end", () => {
        console.log("Conversion complete:", outputFilePath);
        resolve(outputFilePath);
      });
  });
}

// Convert MXF files in batches
async function batchConvertMxfFiles(inputDir, outputDir, batchSize = 5) {
  try {
    const files = await fs.readdir(inputDir);
    const mxfFiles = files.filter(
      (file) => path.extname(file).toLowerCase() === ".mxf"
    );

    for (let i = 0; i < mxfFiles.length; i += batchSize) {
      const batch = mxfFiles.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (file) => {
          const inputFilePath = path.join(inputDir, file);
          const outputFilePath1 = path.join(
            outputDir,
            path.basename(file, ".mxf") + ".mp4"
          );    
          const outputFilePath = `output/${file.replace(
            /\.[^/.]+$/,
            ""
          )}.mp4`;
          await convertMxfToMp4(inputFilePath, outputFilePath);
        })
      );

      console.log(`Batch ${Math.floor(i / batchSize) + 1} complete.`);
    }

    console.log("All conversions complete!");
  } catch (err) {
    console.error("Error during batch conversion:", err);
  }
}

// API Route to start batch conversion
app.post("/convert", async (req, res) => {
  //   const { inputDir, outputDir, batchSize } = req.body;
  const inputDir = path.join(__dirname, "input"); // Directory containing .mxf files
  const outputDir = path.join(__dirname, "output"); // Directory to save converted .mp4 files

  if (!inputDir || !outputDir) {
    return res
      .status(400)
      .json({ error: "inputDir and outputDir are required" });
  }

  try {
    // Ensure the output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Start batch conversion
    await batchConvertMxfFiles(inputDir, outputDir, 5);

    res.status(200).json({ message: "Batch conversion started successfully!" });
  } catch (err) {
    console.error("Error during API request:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
