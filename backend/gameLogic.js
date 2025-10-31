// Game board logic and bot AI
export class GameLogic {
  constructor() {
    this.ROWS = 6;
    this.COLS = 7;
  }

  createEmptyBoard() {
    return Array(this.ROWS).fill(null).map(() => Array(this.COLS).fill(null));
  }

  isValidMove(board, col) {
    return col >= 0 && col < this.COLS && board[0][col] === null;
  }

  makeMove(board, col, player) {
    for (let row = this.ROWS - 1; row >= 0; row--) {
      if (board[row][col] === null) {
        board[row][col] = player;
        return { row, col };
      }
    }
    return null;
  }

  checkWinner(board) {
    // Check horizontal
    for (let row = 0; row < this.ROWS; row++) {
      for (let col = 0; col < this.COLS - 3; col++) {
        if (board[row][col] && 
            board[row][col] === board[row][col + 1] &&
            board[row][col] === board[row][col + 2] &&
            board[row][col] === board[row][col + 3]) {
          return board[row][col];
        }
      }
    }

    // Check vertical
    for (let col = 0; col < this.COLS; col++) {
      for (let row = 0; row < this.ROWS - 3; row++) {
        if (board[row][col] && 
            board[row][col] === board[row + 1][col] &&
            board[row][col] === board[row + 2][col] &&
            board[row][col] === board[row + 3][col]) {
          return board[row][col];
        }
      }
    }

    // Check diagonal (bottom-left to top-right)
    for (let row = 3; row < this.ROWS; row++) {
      for (let col = 0; col < this.COLS - 3; col++) {
        if (board[row][col] && 
            board[row][col] === board[row - 1][col + 1] &&
            board[row][col] === board[row - 2][col + 2] &&
            board[row][col] === board[row - 3][col + 3]) {
          return board[row][col];
        }
      }
    }

    // Check diagonal (top-left to bottom-right)
    for (let row = 0; row < this.ROWS - 3; row++) {
      for (let col = 0; col < this.COLS - 3; col++) {
        if (board[row][col] && 
            board[row][col] === board[row + 1][col + 1] &&
            board[row][col] === board[row + 2][col + 2] &&
            board[row][col] === board[row + 3][col + 3]) {
          return board[row][col];
        }
      }
    }

    return null;
  }

  isBoardFull(board) {
    return board[0].every(cell => cell !== null);
  }

  // Bot AI - Strategic move selection
  getBotMove(board, botPlayer, humanPlayer) {
    // Priority 1: Win if possible
    for (let col = 0; col < this.COLS; col++) {
      if (this.isValidMove(board, col)) {
        const testBoard = board.map(row => [...row]);
        this.makeMove(testBoard, col, botPlayer);
        if (this.checkWinner(testBoard) === botPlayer) {
          return col;
        }
      }
    }

    // Priority 2: Block opponent's winning move
    for (let col = 0; col < this.COLS; col++) {
      if (this.isValidMove(board, col)) {
        const testBoard = board.map(row => [...row]);
        this.makeMove(testBoard, col, humanPlayer);
        if (this.checkWinner(testBoard) === humanPlayer) {
          return col;
        }
      }
    }

    // Priority 3: Take center column if available
    if (this.isValidMove(board, 3)) {
      return 3;
    }

    // Priority 4: Strategic columns (center-adjacent)
    const strategicCols = [3, 2, 4, 1, 5, 0, 6];
    for (let col of strategicCols) {
      if (this.isValidMove(board, col)) {
        return col;
      }
    }

    return 0;
  }
}
