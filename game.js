const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());

// Các lựa chọn trong trò chơi
const choices = ["bao", "búa", "kéo"];

// API: Chơi game
app.post("/api/play", (req, res) => {
  const userChoice = req.body.choice;

  // Kiểm tra lựa chọn của người dùng
  if (!choices.includes(userChoice)) {
    return res
      .status(400)
      .json({
        message:
          'Lựa chọn không hợp lệ. Vui lòng chọn "bao", "búa" hoặc "kéo".',
      });
  }

  // Lựa chọn ngẫu nhiên của máy
  const computerChoice = choices[Math.floor(Math.random() * choices.length)];

  // Xác định kết quả
  let result;
  if (userChoice === computerChoice) {
    result = "Hòa";
  } else if (
    (userChoice === "bao" && computerChoice === "kéo") ||
    (userChoice === "búa" && computerChoice === "bao") ||
    (userChoice === "kéo" && computerChoice === "búa")
  ) {
    result = "Thua";
  } else {
    result = "Thắng";
  }

  // Trả kết quả
  res.json({
    userChoice,
    computerChoice,
    result,
  });
});

// Khởi động server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
