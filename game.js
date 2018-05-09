'use strict';

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  plus(vector) {
    if (!(vector instanceof Vector)) {
      throw new Error('Можно прибавлять к вектору только вектор типа Vector');
    }

    return new Vector(this.x + vector.x, this.y + vector.y);
  }
  times(factor) {
    return new Vector(this.x * factor, this.y * factor);
  }
}

class Actor {
  constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
    if (!(pos instanceof Vector)) {
      throw new Error('pos должно быть типа Vector');
    }

    if (!(size instanceof Vector)) {
      throw new Error('size должно быть типа Vector');
    }

    if (!(speed instanceof Vector)) {
      throw new Error('speed должно быть типа Vector');
    }

    this.pos = pos;
    this.size = size;
    this.speed = speed;

  }
  act() {

  }
  get left() {
    return this.pos.x;
  }
  get right() {
    return this.pos.x + this.size.x;
  }
  get top() {
    return this.pos.y;
  }
  get bottom() {
    return this.pos.y + this.size.y;
  }
  get type() {
    return 'actor';
  }
  isIntersect(actor) {
    if (!(actor instanceof Actor)) {
      throw new Error('actor должно быть типа Actor');
    }
    if (actor === this) {
      return false;
    }

    return actor.left < this.right && actor.right > this.left && actor.top < this.bottom && actor.bottom > this.top;
  }
}

class Level {
  constructor(grid, actors) {
    this.grid = grid; // Двумерный массив строк grid[y][x] типа coin,wall,lava
    this.actors = []; // Список движущихся объектов

    this.player = null;

    // тут можно просто выбросить исключение, если actors не определён,
    // потому что без этого ничего работать не будет
    if (actors !== undefined) {
      this.actors = actors;
      // для поиска объектов в массиве есть специльный метод
      for (let a of actors) {
        if (a.type === 'player') {
          this.player = a;
          break;
        }
      }
    }

    this.height = 0;
    this.width = 0;
    // аналогично actors
    if (grid) {
      // можно немного проще написать с помощью reduce
      // или с помощью map и Math.max
      grid.forEach(row => this.width = (row.length > this.width ? row.length : this.width));
      this.height = grid.length;
    }

    this.status = null;
    this.finishDelay = 1;
  }

  isFinished() {
    return this.status !== null && this.finishDelay < 0;
  }
  actorAt(actor) {
    if (!(actor instanceof Actor)) {
      throw new Error('actor должно быть типа Actor');
    }

    return this.actors.find(elements => actor.isIntersect(elements));
  }
  obstacleAt(position, size) {
    // тут можно не создавать объект только ради того, чтобы прибавить размер к координатам
    const actor = new Actor(position, size);


    if (actor.bottom > this.height) {
      return 'lava';
    }

    if (actor.left < 0 || actor.top < 0 || actor.right > this.width) {
      return 'wall';
    }

    // округлённые значения лушче сохранить в переменных, чтобы не округлять на каждой итараци
    for (let i = Math.floor(actor.left); i < actor.right; i++) {
      for (let j = Math.floor(actor.top); j < actor.bottom; j++) {
        // можно написать просто if (this.grid[j][i])
        // а ещё лучше this.grid[j][i] записать в переменную, чтобы 2 раза не писать
        if (this.grid[j][i] !== undefined) {
          return this.grid[j][i];
        }
      }
    }
  }
  removeActor(actor) {
    for (let i in this.actors) {
      // this.actors.hasOwnProperty(i) можно не проверять, там дальше сравнение с actor
      // для поиска индекса объекта в массиве есть метод
      if (this.actors.hasOwnProperty(i) && actor === this.actors[i]) {
        this.actors.splice(i, 1);
        return;
      }
    }
  }
  noMoreActors(type) {
    // код можно упростить с помощью метода some
    if (this.actors.length === 0) {
      return true;
    }

    for (let actor of this.actors) {
      if (actor.type === type) {
        return false;
      }
    }

    return true;
  }
  playerTouched(type, actor) {
    if (this.status !== null) {
      return;
    }

    if (type === 'lava' || type === 'fireball') {
      this.status = 'lost';
      return;
    }

    if (type === 'coin' && actor instanceof Actor) {
      this.removeActor(actor);
      if(this.noMoreActors('coin')) {
        this.status = 'won';
      }
    }
  }
}

class LevelParser {
  // можно добавить значение по-умолчанию
  constructor(list) {
    // list не очень удачное название, ведь это не массив, а объект
    this.list = list;
  }
  actorFromSymbol(symbol) {
    // что изменится, если убрать все проверки?
    if (symbol === undefined || this.list === undefined) {
      return undefined;
    }

    if (symbol in this.list) {
      return this.list[symbol];
    }

    // это лишняя строчка, функция и так возвращает undefined,
    // если не указано другое
    return undefined;
  }

  obstacleFromSymbol(symbol) {
    let result;
    switch (symbol) {
      case 'x':
        // тут можно сразу написать return 'wall'
        result = 'wall';
        break;
      case '!':
        result = 'lava';
        break;
    }

    return result;
  }

  createGrid(plan) {
    return plan.map(row => {
      return row.split('').map(cell => {
        return this.obstacleFromSymbol(cell);
      });
    });
  }
  createActors(plan) {
    return plan.reduce((result, row, y) => {
      row.split('').forEach((cell, x) => {
        const actor = this.actorFromSymbol(cell);
        if (typeof actor === 'function') {
          const instance = new actor(new Vector(x, y));
          if (instance instanceof Actor) {
            result.push(instance);
          }
        }
      });
      return result;
    }, []);
  }
  parse(plan) {
    return new Level(this.createGrid(plan), this.createActors(plan));
  }
}

class Fireball extends Actor {
  constructor(position, speed) {
    super(position, new Vector(1, 1), speed);
  }
  get type() {
    return 'fireball';
  }
  getNextPosition(time = 1) {
    // тут нужно использовать методы класса Vector
    return new Vector(this.pos.x + this.speed.x * time, this.pos.y + this.speed.y * time);
  }
  handleObstacle() {
    // тут тоже
    this.speed.x *= -1;
    this.speed.y *= -1;
  }
  act(time, level) {
    const nextPosition = this.getNextPosition(time);
    if(level.obstacleAt(nextPosition, this.size)) {
      this.handleObstacle();
    } else {
      this.pos = nextPosition;
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(position) {
    super(position, new Vector(2, 0));
  }
}

class VerticalFireball extends Fireball {
  constructor(position) {
    super(position, new Vector(0, 2));
  }
}

class FireRain extends Fireball {
  constructor(position) {
    super(position, new Vector(0, 3));
    this.originalPosition = position;
  }
  handleObstacle() {
    // не нужно мутировать объекты типа Vector,
    // тут достаточно просто присвоения (сначала нужно исправить замечания выше)
    this.pos.x = this.originalPosition.x;
    this.pos.y = this.originalPosition.y;
  }
}

class Coin extends Actor {
  constructor(position = new Vector(0, 0)) {
    if (!(position instanceof Vector)) {
      throw new Error('pos должно быть типа Vector');
    }

    super(position.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
    this.firstPosition = this.pos;
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * Math.PI * 2;
  }
  get type() {
    return 'coin';
  }
  updateSpring(time = 1) {
    this.spring += this.springSpeed * time;
  }
  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }
  getNextPosition(time = 1) {
    this.spring += this.springSpeed * time;
    return this.firstPosition.plus(this.getSpringVector());
  }
  act(time) {
    this.pos = this.getNextPosition(time);
  }
}

class Player extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5));
  }

  get type() {
    return 'player';
  }
}

const actorDict = {
  '@': Player,
  'v': FireRain,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball
};

const parser = new LevelParser(actorDict);

loadLevels().then(levelsStr => {
  const levels = JSON.parse(levelsStr);
  return runGame(levels, parser, DOMDisplay);
}).then(() => {
  alert('Красаучег)))')
});
