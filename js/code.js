'use strict';
var gameSpeed =-7
var playerLifes = 5
var gameScore = 0;
var resetGameScore = function (){
  gameScore = 0;
}
var GAME_WORLD = [`
...........................................................
...........................................................
...........................................................
...........................................................
...........................................................
...........................................................
...........................................................
........@..................................................
...........................................................
...........................................................
...........................................................
...........................................................
...........................................................
...........................................................
...........................................................
...........................................................
...........................................................
...........................................................
...........................................................
...........................................................
...........................................................
...........................................................
...........................................................
...........................................................
...........................................................
...........................................................
...........................................................
...........................................................
...........................................................
===========================================================
`];


var Level = class Level {
  constructor(plan) {
    let rows = plan.trim().split("\n").map(l => [...l]);
    this.height = rows.length;
    this.width = rows[0].length;
    this.startActors = [];

    this.rows = rows.map((row, y) => {
      return row.map((ch, x) => {
        let type = levelChars[ch];
        
        if (typeof type == "string") return type;

        this.startActors.push(
          type.create(new Vec(x, y), ch));
        return "empty";
      });
    });
  }
}

var State = class State {
  constructor(level, actors, status) {
    this.level = level;
    this.actors = actors;
    this.status = status;
  }

  static start(level) {
    return new State(level, level.startActors, "playing");
  }

  get player() {
    return this.actors.find(a => a.type == "player");
  }
}

var Vec = class Vec {
  constructor(x, y) {
    this.x = x; this.y = y;
  }
  plus(other) {
    return new Vec(this.x + other.x, this.y + other.y);
  }
  times(factor) {
    return new Vec(this.x * factor, this.y * factor);
  }
}

var Player = class Player {
  constructor(pos, speed) {
    this.pos = pos;
    this.speed = speed;
  }

  get type() { return "player"; }

  static create(pos) {
    return new Player(pos.plus(new Vec(0, -0.5)),
                      new Vec(0, 0));
  }
}
Player.prototype.size = new Vec(2, 2);

var Ground = class Ground {
  constructor(pos, speed, reset) {
    this.pos = pos;
    this.speed = speed;
    this.reset = reset;
  }

  get type() { return "ground"; }

  static create(pos, ch) {
      return new Ground(pos, new Vec(gameSpeed, 0));
  }
}

Ground.prototype.size = new Vec(1, 10);

Ground.prototype.collide = function(state) {
  return new State(state.level, state.actors, "lost");
};
Ground.prototype.update = function(time, state) {
  let newPos = this.pos.plus(this.speed.times(time));
  if(state.status =="lost"){
    return new Ground(this.pos, this.speed, this.reset);
    }
  return new Ground(newPos, this.speed, this.reset);
};

var Pipe = class Pipe {
  constructor(direction, pos, speed, reset) {
    this.direction = direction;
    this.pos = pos;
    this.speed = speed;
    this.reset = reset;
  }

  get type() { return "pipe"; }

  static create(direction, pos) {
      return new Pipe(direction, pos, new Vec(gameSpeed, 0));
  }
}
Pipe.prototype.size = new Vec(5.5, 25);

Pipe.prototype.collide = function(state) {
  
  return new State(state.level, state.actors, "lost");
};

Pipe.prototype.update = function(time, state) {
  let newPos = this.pos.plus(this.speed.times(time));

  // if(this.pos.x>5&&this.pos.x<5.12)gameScore+=0.5;

  if(state.status =="lost"){
  return new Pipe(this.direction, this.pos, this.speed,  this.reset);
  }

  return new Pipe(this.direction, newPos, this.speed,  this.reset);
};

var levelChars = {
  ".": "empty", "#": "wall",
  "@": Player,
  "=": Ground, "|": Pipe
};


function elt(name, attrs, ...children) {
  let dom = document.createElement(name);
  for (let attr of Object.keys(attrs)) {
    dom.setAttribute(attr, attrs[attr]);
  }
  for (let child of children) {
    dom.appendChild(child);
  }
  return dom;
}


var scale = 20;

function drawGrid(level) {
  return elt("table", {
    class: "background",
    style: `width: ${level.width * scale}px`
  }, ...level.rows.map(row =>
    elt("tr", {style: `height: ${scale}px`},
        ...row.map(type => elt("td", {class: type})))
  ));
}

function drawActors(actors) {
  return elt("div", {}, ...actors.map(actor => {
    let rect = elt("div", {class: `actor ${actor.type}`});
    rect.style.width = `${actor.size.x * scale}px`;
    rect.style.height = `${actor.size.y * scale}px`;
    rect.style.left = `${actor.pos.x * scale}px`;
    rect.style.top = `${actor.pos.y * scale}px`;
    return rect;
  }));
}


Level.prototype.touches = function(pos, size, type) {
  
  var xStart = Math.floor(pos.x);
  var xEnd = Math.ceil(pos.x + size.x);
  var yStart = Math.floor(pos.y);
  var yEnd = Math.ceil(pos.y + size.y);

  for (var y = yStart; y < yEnd; y++) {
    for (var x = xStart; x < xEnd; x++) {
      let isOutside = x < 0 || x >= this.width ||
                      y < 0 || y >= this.height;
      let here = isOutside ? "wall" : this.rows[y][x];
      if (here == type) return true;

    }
  }
  return false;
};


function randomPipeLocation(){
  randomYLocation = Math.floor(Math.random() * Math.floor(12)) + 14;
  randomXLocation = Math.floor(Math.random() * Math.floor(5)) + 25;
  return randomYLocation, randomXLocation
}

var randomYLocation;
var randomXLocation;
var timeCounter = 0;
var pipeCounterCooldown=0;
State.prototype.update = function(time, keys) {
  randomYLocation, randomXLocation = randomPipeLocation();
  timeCounter++;
  // if(timeCounter%450 ==0)
  //   gameSpeed -=1

  if(timeCounter%150 == 0){// Appending Pipe
    this.actors.push(Pipe.create("downward", new Vec(randomXLocation,randomYLocation)));
    this.actors.push(Pipe.create("upward", new Vec(randomXLocation,randomYLocation-33)));
  }

  if(timeCounter%8==0){// Appending Ground
    this.actors.push(Ground.create(new Vec(30,29)));
  }

  
  let actors = this.actors
    .map(actor => actor.update(time, this, keys));
  
  let newState = new State(this.level, actors, this.status);

  if (newState.status != "playing") return newState;

  let player = newState.player;

  
  for (let actor of actors) {
    if(pipeCounterCooldown+10<timeCounter){
      if(actor.type == "pipe"){
        if(Math.ceil(actor.pos.x)==Math.ceil(player.pos.x-7)){
          gameScore++;
          pipeCounterCooldown=timeCounter;

        }
      }
    }
    if (actor != player && overlap(actor, player)) {
      newState = actor.collide(newState);
    }
  }

  return newState;
};

function overlap(actor1, actor2) {
  return actor1.pos.x + actor1.size.x > actor2.pos.x &&
         actor1.pos.x < actor2.pos.x + actor2.size.x &&
         actor1.pos.y + actor1.size.y > actor2.pos.y &&
         actor1.pos.y < actor2.pos.y + actor2.size.y;
}

let xSpeed = 0;
var gravity = 55;
var jumpSpeed = -10;
Player.prototype.update = function(time, state, keys) {
  
  let ySpeed = this.speed.y + time * gravity;
  if (keys.ArrowUp) ySpeed = jumpSpeed;

  let pos = this.pos;
  let newPos = pos.plus(new Vec(xSpeed * time, ySpeed * time));

  if((state.status =="lost")||
  (state.level.touches(newPos, this.size, "wall"))){
      return new Player(pos, new Vec(xSpeed, ySpeed));
  }
  return new Player(newPos, new Vec(xSpeed, ySpeed));
};

function trackKeys(keys) {
  let down = Object.create(null);
  function track(event) {
    if (keys.includes(event.key)) {
      down[event.key] = (event.type == "keydown");
      event.preventDefault();
    }
  }

  window.addEventListener("keydown", track);
  window.addEventListener("keyup", track);
  return down;
}

var arrowKeys =
  trackKeys(["ArrowUp"]);

function runAnimation(frameFunc) {
  let lastTime = null;
  function frame(time) {
    if (lastTime != null) {
      let timeStep = Math.min(time - lastTime, 100) / 1000;
      if (frameFunc(timeStep) === false) return;
    }
    lastTime = time;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function runLevel(level, Display) {
  let display = new Display(document.body, level);
  let state = State.start(level);

  return new Promise(resolve => {
    runAnimation(time => {
      state = state.update(time, arrowKeys);
      display.syncState(state);

      if(playerLifes==0){
        state.status = "lost"
        display.drawGameOver();
        return false;

      }
      if (state.status == "playing") {
        return true;
      } 
      else {
        display.clear();
        playerLifes--;
        resetGameScore();
        resolve(state.status);
        return false;
      }
      
    });
  });
}

async function runGame(Display) {
  for (let level = 0; level < GAME_WORLD.length;) {
    
    let status = await runLevel(new Level(GAME_WORLD[level]),
                                Display);
    // console.log(status)
                              
    if (status == "won"){
      level++;
    }else {

      await runLevel(new Level(GAME_WORLD[level]),
    Display);}
  }
}


// Canvas Engine


var CanvasDisplay = class CanvasDisplay {
  constructor(parent, level) {
    this.canvas = document.createElement("canvas");
    this.canvas.style.margin = "0 35vw";
    this.canvas.width = 475
    this.canvas.height = 600
    parent.appendChild(this.canvas);
    this.cx = this.canvas.getContext("2d");

    this.flipPlayer = false;

    this.viewport = {
      left: 0,
      top: 0,
      width: this.canvas.width / scale,
      height: this.canvas.height / scale
    };
  }
  clear() {
    this.canvas.remove();
  }
}

//Locking center...
CanvasDisplay.prototype.updateViewport = function(state) {
  let view = this.viewport, margin = view.width / 3;
  let player = state.player;
  let center = player.pos.plus(player.size.times(0.5));
  view.left = Math.max(center.x - margin, 0);
};
CanvasDisplay.prototype.syncState = function(state) {
  this.updateViewport(state);
  this.clearDisplay(state.status);
  this.drawBackground(state.level);
  this.drawActors(state.actors);
  this.drawScore();
  this.drawLifes();
};

var gameover = new Image();
gameover.src = "./img/gameover.jpg";
CanvasDisplay.prototype.drawGameOver = function(){
  this.cx.drawImage(gameover,0,100,475,250);
}
CanvasDisplay.prototype.drawLifes = function(){
  let width = 43;
  for(let y=0; y<playerLifes; y++){

    this.cx.drawImage(birdSprites, width*2, 0, 43, 30, 
                          435-(width*y), 0, 35, 25)
  }
}
CanvasDisplay.prototype.drawScore = function(){
  this.cx.font = "20px Arial";
  this.cx.fillStyle = "red";
  this.cx.fillText("Game Score: "+gameScore, 0, 20);
}
CanvasDisplay.prototype.clearDisplay = function(status) {
  if (status == "won") {
    this.cx.fillStyle = "rgb(68, 191, 255)";
  } else if (status == "lost") {
    this.cx.fillStyle = "rgb(44, 136, 214)";
  } else {
    this.cx.fillStyle = "rgb(52, 166, 251)";
  }
  this.cx.fillRect(0, 0,
                   this.canvas.width, this.canvas.height);
};

  var background = new Image();
  background.src = "./img/background.png";
/////* Drawing background and the ground tiles */////
CanvasDisplay.prototype.drawBackground = function(level) {
  this.cx.drawImage(background,0,0,475,550);
};
/////* Drawing background and the ground tiles */////

/////* Drawing the player bird */////
var birdSprites = document.createElement("img");
birdSprites.src = "img/bird.png";
var playerYOverlap = 20;
var angle = 0;
CanvasDisplay.prototype.drawPlayer = function(player, x, y,
                                              width, height){
  y -= playerYOverlap;
  width = 43;                             
  let tile = Math.floor(Date.now() / 60) % 3;
  let tileX = tile * width;
       
  if(angle<75){
    angle = player.speed.y*1.5
    if(angle>75)
    {
      angle = 74
    }
  }
                                              
  this.cx.save();
  this.cx.beginPath();
  this.cx.arc(x+25, y+20, 23, 0, Math.PI * 2, true);
  this.cx.closePath();
  this.cx.clip();

  this.cx.translate(x+width/2, y+height/2);
  this.cx.rotate(Math.PI / 180 * (angle));
  this.cx.translate(-(x+width/2), -(y+height/2));
  
  this.cx.drawImage(birdSprites,tileX, 0, width-1, height-1,
                                x,     y, width+5, height+5);
  
  this.cx.beginPath();
  this.cx.arc(x+25, y+20, 20, 0, Math.PI * 2, true);
  this.cx.clip();
  this.cx.closePath();
  this.cx.restore();
};
///* Drawing the player bird */////


var ground = document.createElement("img");
ground.src = "img/ground.png";
var pipe = document.createElement("img");
pipe.src = "img/pipedown.png";

CanvasDisplay.prototype.drawActors = function(actors) {

  for (let actor of actors) {
    let playerWidth = actor.size.x * scale;
    let playerHeight = actor.size.y * scale;
    let x = (actor.pos.x - this.viewport.left) * scale;
    let y = (actor.pos.y - this.viewport.top) * scale;
    let downPipeHeight = scale*(28.8-actor.pos.y)
    let upPipeHeight = scale*(actor.pos.y+24);
    if (actor.type == "player") {
      this.drawPlayer(actor, x, y, playerWidth, playerHeight);
    } 

    if (actor.type == "pipe") {

      if(actor.direction == "downward"){
        this.cx.save();
        this.cx.drawImage(pipe,
                          0, 0, 140, downPipeHeight,
                          x, y-25, 120, downPipeHeight);
        this.cx.restore();
      }

      if(actor.direction == "upward"){
        this.cx.save();
        this.cx.scale(1, -1);
        this.cx.drawImage(pipe,
                            0,0, 140, upPipeHeight,
                            x, -upPipeHeight, 120, upPipeHeight);
        this.cx.restore();
      }
    }
    if (actor.type == "ground") {
      this.cx.drawImage(ground,
                        0, 0, 90, 100,
                        x, y-30, 50, 50);
    }
  }
};