
window.requestAnimFrame = function () {
  return window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  function (callback) {
    window.setTimeout(callback, 1000 / 60);
  };
}();

// now we will setup our basic variables for the demo
var canvas = document.getElementById('canvas'),
ctx = canvas.getContext('2d'),
// full screen dimensions
cw = window.innerWidth,
ch = window.innerHeight,
// firework collection
fireworks = [],
// particle collection
particles = [],
// starting hue
hue = 120,
// when launching fireworks with a click, too many get launched at once without a limiter, one launch per 5 loop ticks
limiterTotal = 5,
limiterTick = 0,
// this will time the auto launches of fireworks, one launch per 80 loop ticks
timerTotal = 80,
timerTick = 0,
mousedown = false,
// mouse x coordinate,
mx,
// mouse y coordinate
my;

// set canvas dimensions
canvas.width = cw;
canvas.height = ch;

// now we are going to setup our function placeholders for the entire demo

// get a random number within a range
function random(min, max) {
  return Math.random() * (max - min) + min;
}

// calculate the distance between two points
function calculateDistance(p1x, p1y, p2x, p2y) {
  var xDistance = p1x - p2x,
  yDistance = p1y - p2y;
  return Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));
}

// create firework
function Firework(sx, sy, tx, ty) {
  // actual coordinates
  this.x = sx;
  this.y = sy;
  // starting coordinates
  this.sx = sx;
  this.sy = sy;
  // target coordinates
  this.tx = tx;
  this.ty = ty;
  // distance from starting point to target
  this.distanceToTarget = calculateDistance(sx, sy, tx, ty);
  this.distanceTraveled = 0;
  // track the past coordinates of each firework to create a trail effect, increase the coordinate count to create more prominent trails
  this.coordinates = [];
  this.coordinateCount = 3;
  // populate initial coordinate collection with the current coordinates
  while (this.coordinateCount--) {
    this.coordinates.push([this.x, this.y]);
  }
  this.angle = Math.atan2(ty - sy, tx - sx);
  this.speed = 2;
  this.acceleration = 1.05;
  this.brightness = random(50, 70);
  // circle target indicator radius
  this.targetRadius = 1;
}

// update firework
Firework.prototype.update = function (index) {
  // remove last item in coordinates array
  this.coordinates.pop();
  // add current coordinates to the start of the array
  this.coordinates.unshift([this.x, this.y]);

  // cycle the circle target indicator radius
  if (this.targetRadius < 8) {
    this.targetRadius += 0.3;
  } else {
    this.targetRadius = 1;
  }

  // speed up the firework
  this.speed *= this.acceleration;

  // get the current velocities based on angle and speed
  var vx = Math.cos(this.angle) * this.speed,
  vy = Math.sin(this.angle) * this.speed;
  // how far will the firework have traveled with velocities applied?
  this.distanceTraveled = calculateDistance(this.sx, this.sy, this.x + vx, this.y + vy);

  // if the distance traveled, including velocities, is greater than the initial distance to the target, then the target has been reached
  if (this.distanceTraveled >= this.distanceToTarget) {
    createParticles(this.tx, this.ty);
    // remove the firework, use the index passed into the update function to determine which to remove
    fireworks.splice(index, 1);
  } else {
    // target not reached, keep traveling
    this.x += vx;
    this.y += vy;
  }
};

// draw firework
Firework.prototype.draw = function () {
  ctx.beginPath();
  // move to the last tracked coordinate in the set, then draw a line to the current x and y
  ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
  ctx.lineTo(this.x, this.y);
  ctx.strokeStyle = 'hsl(' + hue + ', 100%, ' + this.brightness + '%)';
  ctx.stroke();

  ctx.beginPath();
  // draw the target for this firework with a pulsing circle
  ctx.arc(this.tx, this.ty, this.targetRadius, 0, Math.PI * 2);
  ctx.stroke();
};

// create particle
function Particle(x, y) {
  this.x = x;
  this.y = y;
  // track the past coordinates of each particle to create a trail effect, increase the coordinate count to create more prominent trails
  this.coordinates = [];
  this.coordinateCount = 5;
  while (this.coordinateCount--) {
    this.coordinates.push([this.x, this.y]);
  }
  // set a random angle in all possible directions, in radians
  this.angle = random(0, Math.PI * 2);
  this.speed = random(1, 10);
  // friction will slow the particle down
  this.friction = 0.95;
  // gravity will be applied and pull the particle down
  this.gravity = 1;
  // set the hue to a random number +-20 of the overall hue variable
  this.hue = random(hue - 20, hue + 20);
  this.brightness = random(50, 80);
  this.alpha = 1;
  // set how fast the particle fades out
  this.decay = random(0.015, 0.03);
}

// update particle
Particle.prototype.update = function (index) {
  // remove last item in coordinates array
  this.coordinates.pop();
  // add current coordinates to the start of the array
  this.coordinates.unshift([this.x, this.y]);
  // slow down the particle
  this.speed *= this.friction;
  // apply velocity
  this.x += Math.cos(this.angle) * this.speed;
  this.y += Math.sin(this.angle) * this.speed + this.gravity;
  // fade out the particle
  this.alpha -= this.decay;

  // remove the particle once the alpha is low enough, based on the passed in index
  if (this.alpha <= this.decay) {
    particles.splice(index, 1);
  }
};

// draw particle
Particle.prototype.draw = function () {
  ctx.beginPath();
  // move to the last tracked coordinates in the set, then draw a line to the current x and y
  ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
  ctx.lineTo(this.x, this.y);
  ctx.strokeStyle = 'hsla(' + this.hue + ', 100%, ' + this.brightness + '%, ' + this.alpha + ')';
  ctx.stroke();
};

// create particle group/explosion
function createParticles(x, y) {
  // increase the particle count for a bigger explosion, beware of the canvas performance hit with the increased particles though
  var particleCount = 30;
  while (particleCount--) {
    particles.push(new Particle(x, y));
  }
}

// main demo loop
function loop() {
  // this function will run endlessly with requestAnimationFrame
  requestAnimFrame(loop);

  // increase the hue to get different colored fireworks over time
  hue += 0.5;

  // normally, clearRect() would be used to clear the canvas
  // we want to create a trailing effect though
  // setting the composite operation to destination-out will allow us to clear the canvas at a specific opacity, rather than wiping it entirely
  ctx.globalCompositeOperation = 'destination-out';
  // decrease the alpha property to create more prominent trails
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, cw, ch);
  // change the composite operation back to our main mode
  // lighter creates bright highlight points as the fireworks and particles overlap each other
  ctx.globalCompositeOperation = 'lighter';

  // loop over each firework, draw it, update it
  var i = fireworks.length;
  while (i--) {
    fireworks[i].draw();
    fireworks[i].update(i);
  }

  // loop over each particle, draw it, update it
  var i = particles.length;
  while (i--) {
    particles[i].draw();
    particles[i].update(i);
  }

  // launch fireworks automatically to random coordinates, when the mouse isn't down
  if (timerTick >= timerTotal) {
    if (!mousedown) {
      // start the firework at the bottom middle of the screen, then set the random target coordinates, the random y coordinates will be set within the range of the top half of the screen
      fireworks.push(new Firework(cw / 2, ch, random(0, cw), random(0, ch / 2)));
      timerTick = 0;
    }
  } else {
    timerTick++;
  }

  // limit the rate at which fireworks get launched when mouse is down
  if (limiterTick >= limiterTotal) {
    if (mousedown) {
      // start the firework at the bottom middle of the screen, then set the current mouse coordinates as the target
      fireworks.push(new Firework(cw / 2, ch, mx, my));
      limiterTick = 0;
    }
  } else {
    limiterTick++;
  }
}

window.onload = function () {
  var merrywrap = document.getElementById("merrywrap");
  var box = merrywrap.getElementsByClassName("giftbox")[0];
  var step = 1;
  var stepMinutes = [2000, 2000, 1000, 1000];
  function init() {
    box.addEventListener("click", openBox, false);
  }
  function stepClass(step) {
    merrywrap.className = 'merrywrap';
    merrywrap.className = 'merrywrap step-' + step;
  }
  function openBox() {
    if (step === 1) {
      box.removeEventListener("click", openBox, false);
    }
    stepClass(step);
    if (step === 3) {
    }
    if (step === 4) {
      reveal();
      return;
    }
    setTimeout(openBox, stepMinutes[step - 1]);
    step++;
  }

  init();

};

function reveal() {
  document.querySelector('.merrywrap').style.backgroundColor = 'transparent';

  loop();

  var w, h;
  if (window.innerWidth >= 1000) {
    w = 495;h = 345;
  } else
  {
    w = 500;h = 355;
  }

  var ifrm = document.createElement("iframe");
  ifrm.setAttribute("src", "data:image/jpeg;base64,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");
  //ifrm.style.width = `${w}px`;
  //ifrm.style.height = `${h}px`;
  ifrm.style.border = 'none';
  document.querySelector('#video').appendChild(ifrm);
}

