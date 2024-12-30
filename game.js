class Snake {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.gridSize = 20;
    this.resizeCanvas();
    this.baseSpeed = 5; // Velocidad inicial
    this.maxSpeed = 15; // Velocidad máxima
    this.speedIncrease = 0.5; // Incremento mayor de velocidad por comida
    this.speed = this.baseSpeed;
    this.memeImages = [];
    this.imagesLoaded = false;
    this.loadMemeImages();
    this.gameOver = false;
    this.reset();
    this.setupEventListeners();
    this.lastTime = 0;
    this.animate = this.animate.bind(this);
    this.foodAnimationTime = 0;
    this.foodEatenEffect = null;

    // Añadir evento de resize
    window.addEventListener("resize", () => {
      this.resizeCanvas();
    });
  }

  resizeCanvas() {
    // Calcular el tamaño del canvas basado en la ventana
    const maxSize = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.9);
    this.canvas.width = maxSize;
    this.canvas.height = maxSize;
    this.cellSize = this.canvas.width / this.gridSize;
  }

  loadMemeImages() {
    const memeUrls = [
      "https://i.imgur.com/6amXGTM.jpeg",
      "https://i.imgur.com/8nLFCVP.png",
      "https://i.imgur.com/JNjYDr7.png",
      "https://i.imgur.com/v3kmplx.jpeg",
      "https://i.imgur.com/l9ykNfF.gif",
    ];

    let loadedImages = 0;
    memeUrls.forEach((url) => {
      const img = new Image();
      img.onload = () => {
        loadedImages++;
        if (loadedImages === memeUrls.length) {
          this.imagesLoaded = true;
        }
      };
      img.onerror = () => {
        console.error("Error loading image:", url);
      };
      img.src = url;
      this.memeImages.push(img);
    });
  }

  reset() {
    // Initialize with fixed meme indices
    this.segments = [
      { x: 10, y: 10, memeIndex: 0 },
      { x: 9, y: 10, memeIndex: 1 },
      { x: 8, y: 10, memeIndex: 2 },
    ];

    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.food = this.generateFood();
    this.score = 0;
    this.speed = this.baseSpeed; // Resetear la velocidad al inicio
    this.moveAccumulator = 0;
    this.lastPositions = this.segments.map((s) => ({ ...s }));
    document.getElementById("scoreValue").textContent = this.score;
    this.nextMemeIndex = 3; // Index for the next segment to be added
    this.foodAnimationTime = 0;
    this.foodEatenEffect = null;
  }

  setupEventListeners() {
    // Keyboard controls
    document.addEventListener("keydown", (e) => {
      if (this.gameOver) {
        if (e.key === "Enter") {
          this.gameOver = false;
          this.reset();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case "arrowup":
        case "w":
          if (this.direction.y === 0) this.nextDirection = { x: 0, y: -1 };
          break;
        case "arrowdown":
        case "s":
          if (this.direction.y === 0) this.nextDirection = { x: 0, y: 1 };
          break;
        case "arrowleft":
        case "a":
          if (this.direction.x === 0) this.nextDirection = { x: -1, y: 0 };
          break;
        case "arrowright":
        case "d":
          if (this.direction.x === 0) this.nextDirection = { x: 1, y: 0 };
          break;
      }
    });

    // Touch controls
    let touchStartX = 0;
    let touchStartY = 0;
    const minSwipeDistance = 30; // Distancia mínima para considerar un swipe

    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        e.preventDefault(); // Prevenir scroll
      },
      { passive: false }
    );

    this.canvas.addEventListener(
      "touchend",
      (e) => {
        if (this.gameOver) {
          this.gameOver = false;
          this.reset();
          return;
        }

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;

        // Usar la dirección con mayor magnitud
        if (Math.abs(dx) > Math.abs(dy)) {
          // Movimiento horizontal
          if (Math.abs(dx) > minSwipeDistance) {
            if (dx > 0 && this.direction.x === 0) {
              this.nextDirection = { x: 1, y: 0 }; // Derecha
            } else if (dx < 0 && this.direction.x === 0) {
              this.nextDirection = { x: -1, y: 0 }; // Izquierda
            }
          }
        } else {
          // Movimiento vertical
          if (Math.abs(dy) > minSwipeDistance) {
            if (dy > 0 && this.direction.y === 0) {
              this.nextDirection = { x: 0, y: 1 }; // Abajo
            } else if (dy < 0 && this.direction.y === 0) {
              this.nextDirection = { x: 0, y: -1 }; // Arriba
            }
          }
        }

        e.preventDefault();
      },
      { passive: false }
    );

    // Prevenir comportamientos por defecto del navegador en móviles
    this.canvas.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
      },
      { passive: false }
    );
  }

  generateFood() {
    let food;
    do {
      food = {
        x: Math.floor(Math.random() * this.gridSize),
        y: Math.floor(Math.random() * this.gridSize),
      };
    } while (
      this.segments.some(
        (segment) => segment.x === food.x && segment.y === food.y
      )
    );
    return food;
  }

  checkCollision() {
    const head = this.segments[0];
    // Only check collision with segments after the second one
    for (let i = 2; i < this.segments.length; i++) {
      if (head.x === this.segments[i].x && head.y === this.segments[i].y) {
        return true;
      }
    }
    return false;
  }

  startFoodEatenAnimation(x, y) {
    this.foodEatenEffect = {
      x: x,
      y: y,
      time: 0,
      duration: 500, // 500ms de duración
    };
  }

  increaseSpeed() {
    // Aumentar la velocidad gradualmente hasta el máximo
    this.speed = Math.min(this.maxSpeed, this.speed + this.speedIncrease);
  }

  update(deltaTime) {
    if (this.gameOver) return;

    // Actualizar animación de comida
    this.foodAnimationTime += deltaTime;

    // Actualizar efecto de comida comida si existe
    if (this.foodEatenEffect) {
      this.foodEatenEffect.time += deltaTime;
      if (this.foodEatenEffect.time >= this.foodEatenEffect.duration) {
        this.foodEatenEffect = null;
      }
    }

    this.moveAccumulator += deltaTime / 1000;
    const moveInterval = 1 / this.speed;
    const moveProgress = this.moveAccumulator / moveInterval;

    if (this.moveAccumulator >= moveInterval) {
      this.moveAccumulator = 0;
      this.lastPositions = this.segments.map((s) => ({ ...s }));

      this.direction = this.nextDirection;
      const newHead = {
        x:
          (this.segments[0].x + this.direction.x + this.gridSize) %
          this.gridSize,
        y:
          (this.segments[0].y + this.direction.y + this.gridSize) %
          this.gridSize,
        memeIndex: this.segments[0].memeIndex,
      };

      if (newHead.x === this.food.x && newHead.y === this.food.y) {
        this.startFoodEatenAnimation(this.food.x, this.food.y);
        const newSegment = {
          x: newHead.x,
          y: newHead.y,
          memeIndex: this.nextMemeIndex,
        };

        this.nextMemeIndex = (this.nextMemeIndex + 1) % this.memeImages.length;
        this.segments.unshift(newSegment);
        this.lastPositions.unshift({ ...newSegment });

        this.food = this.generateFood();
        this.score++;
        this.increaseSpeed(); // Aumentar la velocidad al comer
        document.getElementById("scoreValue").textContent = this.score;
      } else {
        const oldSegments = [...this.segments];
        this.segments[0] = newHead;
        for (let i = 1; i < this.segments.length; i++) {
          this.segments[i] = {
            x: oldSegments[i - 1].x,
            y: oldSegments[i - 1].y,
            memeIndex: oldSegments[i].memeIndex,
          };
        }
      }

      if (this.checkCollision()) {
        this.gameOver = true;
        return;
      }
    }
  }

  drawRoundedRect(x, y, width, height, radius) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius,
      y + height
    );
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
    this.ctx.fill();
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw food with subtle pulsing animation
    this.ctx.fillStyle = "#e74c3c";
    const pulseScale = 1 + Math.sin(this.foodAnimationTime * 0.01) * 0.05;
    const baseFoodSize = this.cellSize * 0.8;
    const foodSize = baseFoodSize * pulseScale;
    const foodX = (this.food.x + 0.5) * this.cellSize - foodSize / 2;
    const foodY = (this.food.y + 0.5) * this.cellSize - foodSize / 2;
    this.drawRoundedRect(foodX, foodY, foodSize, foodSize, foodSize * 0.3);

    // Draw food eaten effect if active
    if (this.foodEatenEffect) {
      const progress =
        this.foodEatenEffect.time / this.foodEatenEffect.duration;
      const size = baseFoodSize * (1 + progress);
      const opacity = 1 - progress;

      this.ctx.save();
      this.ctx.fillStyle = `rgba(231, 76, 60, ${opacity})`;
      const effectX = (this.foodEatenEffect.x + 0.5) * this.cellSize - size / 2;
      const effectY = (this.foodEatenEffect.y + 0.5) * this.cellSize - size / 2;
      this.drawRoundedRect(effectX, effectY, size, size, size * 0.3);
      this.ctx.restore();
    }

    const moveInterval = 1 / this.speed;
    const moveProgress = this.moveAccumulator / moveInterval;

    // Draw snake segments
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const segment = this.segments[i];
      const lastPos = this.lastPositions[i];
      let drawX = segment.x;
      let drawY = segment.y;

      if (moveProgress < 1 && lastPos) {
        let dx = segment.x - lastPos.x;
        let dy = segment.y - lastPos.y;

        if (Math.abs(dx) > this.gridSize / 2) {
          dx = dx > 0 ? dx - this.gridSize : dx + this.gridSize;
        }
        if (Math.abs(dy) > this.gridSize / 2) {
          dy = dy > 0 ? dy - this.gridSize : dy + this.gridSize;
        }

        drawX = lastPos.x + dx * moveProgress;
        drawY = lastPos.y + dy * moveProgress;

        drawX = (drawX + this.gridSize) % this.gridSize;
        drawY = (drawY + this.gridSize) % this.gridSize;
      }

      const x = drawX * this.cellSize;
      const y = drawY * this.cellSize;

      if (this.imagesLoaded && this.memeImages[segment.memeIndex]) {
        this.ctx.save();
        this.ctx.beginPath();
        this.roundedRect(x, y, this.cellSize, this.cellSize, 4);
        this.ctx.clip();
        this.ctx.drawImage(
          this.memeImages[segment.memeIndex],
          x,
          y,
          this.cellSize,
          this.cellSize
        );
        this.ctx.restore();
      } else {
        this.ctx.fillStyle = i === 0 ? "#27ae60" : "#2ecc71";
        this.drawRoundedRect(x, y, this.cellSize, this.cellSize, 4);
      }
    }

    // Draw Game Over screen
    if (this.gameOver) {
      this.ctx.save();
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.ctx.fillStyle = "white";
      this.ctx.font = "48px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        "Game Over!",
        this.canvas.width / 2,
        this.canvas.height / 2 - 70
      );

      this.ctx.font = "24px Arial";
      this.ctx.fillText(
        `Score: ${this.score}`,
        this.canvas.width / 2,
        this.canvas.height / 2 - 20
      );
      this.ctx.fillText(
        `Final Speed: ${this.speed.toFixed(1)}x`,
        this.canvas.width / 2,
        this.canvas.height / 2 + 20
      );

      this.ctx.font = "20px Arial";
      this.ctx.fillText(
        "Press Enter to play again",
        this.canvas.width / 2,
        this.canvas.height / 2 + 70
      );
      this.ctx.restore();
    }
  }

  animate(currentTime) {
    if (this.lastTime === 0) {
      this.lastTime = currentTime;
    }

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.draw();

    requestAnimationFrame(this.animate);
  }

  // Nuevo método para crear path de rectángulo redondeado sin rellenar
  roundedRect(x, y, width, height, radius) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius,
      y + height
    );
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }
}

// Initialize game
window.onload = () => {
  const canvas = document.getElementById("gameCanvas");
  const game = new Snake(canvas);
  game.animate(0);
};
