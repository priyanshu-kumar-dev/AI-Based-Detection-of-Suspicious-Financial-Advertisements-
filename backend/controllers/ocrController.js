const extractTextFromImage = require(
  "../services/ocrService"
);

const extractText = async (
  req,
  res
) => {
  try {

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded"
      });
    }

    const text =
      await extractTextFromImage(
        req.file.path
      );

    res.json({
      success: true,
      text
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: "OCR Failed"
    });
  }
};

module.exports = {
  extractText
};