class GameWebSocket {
  constructor() {
    this.socket = null;
    this.connect();
  }

  connect() {
    this.socket = new WebSocket("ws://localhost:8080");

    this.socket.onopen = () => {
      console.log("Connected to game server");
      this.loadUserData();
    };

    this.socket.onclose = () => {
      console.log("Disconnected from server");
      // Thử kết nối lại sau 5 giây
      setTimeout(() => this.connect(), 5000);
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };
  }

  loadUserData() {
    // Load dữ liệu người dùng từ localStorage
    const balance = localStorage.getItem("balance") || "0";
    const nickname = localStorage.getItem("nickname") || "Player";

    // Cập nhật UI trên tất cả các trang
    this.updateUserInterface(balance, nickname);
  }

  updateUserInterface(balance, nickname) {
    // Cập nhật số dư
    const balanceElement = document.getElementById("balance");
    if (balanceElement) {
      balanceElement.textContent = balance;
    }

    // Cập nhật nickname
    const nicknameElement = document.getElementById("player1-name");
    if (nicknameElement) {
      nicknameElement.textContent = nickname;
    }
  }

  handleMessage(data) {
    switch (data.type) {
      // Xử lý tạo bàn chơi
      case "table_created":
        if (window.location.pathname.includes("choose-table.html")) {
          addTableToList(data.table);
        }
        break;

      // Xử lý tìm trận
      case "match_found":
        if (window.location.pathname.includes("quick-play.html")) {
          handleMatchFound(data);
        }
        break;

      case "bet_confirmed":
        // Cập nhật UI để thông báo đặt cược đã được xác nhận
        break;

      // Xử lý kết quả trận đấu
      case "game_result":
        handleGameResult(data);
        this.updateBalance(data.newBalance);
        break;

      // Xử lý cập nhật số dư
      case "balance_update":
        this.updateBalance(data.balance);
        break;
    }
  }

  updateBalance(newBalance) {
    localStorage.setItem("balance", newBalance);
    this.loadUserData();
  }

  // Các phương thức gửi tin nhắn tới server
  findMatch() {
    this.socket.send(
      JSON.stringify({
        type: "find_match",
      })
    );
  }

  createTable(tableName, betAmount) {
    this.socket.send(
      JSON.stringify({
        type: "create_table",
        name: tableName,
        betAmount: betAmount,
      })
    );
  }

  joinTable(tableId) {
    this.socket.send(
      JSON.stringify({
        type: "join_table",
        tableId: tableId,
      })
    );
  }

  placeBet(amount) {
    if (amount <= 0) {
      alert("Số tiền cược phải lớn hơn 0!");
      return;
    }
    this.socket.send(
      JSON.stringify({
        type: "place_bet",
        amount: amount,
      })
    );
  }

  makeChoice(choice) {
    this.socket.send(
      JSON.stringify({
        type: "player_choice",
        choice: choice,
      })
    );
  }
}

// Khởi tạo single instance của WebSocket service
const gameService = new GameWebSocket();
