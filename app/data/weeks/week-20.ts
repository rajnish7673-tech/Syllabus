import type { Week } from "../types";

export const week20: Week = {
  week: 20,
  theme: "Classes, this & OOP",
  color: "#22C55E",
  topics: [
    {
      title: "Classes in JavaScript",
      subtopics: [
        "class syntax",
        "constructor",
        "instance methods",
        "static methods",
        "private fields",
      ],
      questions: [
        {
          q: "Are JavaScript classes real classes or just syntax sugar?",
          answer: `JavaScript classes are mostly syntax sugar over prototypes.

That means:
- \`class\` gives cleaner syntax
- but under the hood, JS still uses prototype-based inheritance
- methods are stored on \`ClassName.prototype\`, not copied into every object

~~~js
class User {
  constructor(name) {
    this.name = name;
  }

  greet() {
    return "Hi " + this.name;
  }
}

const u1 = new User("Raj");
console.log(u1.greet());
~~~

Under the hood, this behaves roughly like:

~~~js
function User(name) {
  this.name = name;
}

User.prototype.greet = function () {
  return "Hi " + this.name;
};
~~~

~~~text
instance -> User.prototype -> Object.prototype -> null
~~~

Easy interview line:
"JavaScript classes are not like Java or C++ classes internally. They are a nicer syntax built on top of prototype-based inheritance."

Why interviewers ask this:
- to check whether you only know syntax
- or whether you understand how JS really works under the hood`,
        },
        {
          q: "What is the difference between instance methods and static methods?",
          answer: `Instance methods belong to objects created from the class. Static methods belong to the class itself.

~~~js
class MathHelper {
  static add(a, b) {
    return a + b;
  }

  square(n) {
    return n * n;
  }
}

console.log(MathHelper.add(2, 3)); // 5

const m = new MathHelper();
console.log(m.square(4)); // 16
~~~

~~~text
static method   -> ClassName.method()
instance method -> object.method()
~~~

Analogy:
- static method = company rule book, shared by everyone
- instance method = behavior of one employee object

Use static methods when:
- logic does not depend on a specific object
- utility behavior belongs conceptually to the class

Use instance methods when:
- logic depends on object state like \`this.name\`, \`this.id\`, \`this.items\`

Common mistake:

~~~js
class A {
  static hello() {
    return "hello";
  }
}

const a = new A();
// a.hello(); // TypeError
~~~

Short answer:
"Static methods are called on the class, instance methods are called on objects created from the class."`,
        },
        {
          q: "What are private fields in JavaScript classes?",
          answer: `Private fields are class fields prefixed with \`#\`. They can only be accessed inside that class body.

~~~js
class BankAccount {
  #balance = 0;

  deposit(amount) {
    this.#balance += amount;
  }

  getBalance() {
    return this.#balance;
  }
}

const acc = new BankAccount();
acc.deposit(500);
console.log(acc.getBalance()); // 500
// console.log(acc.#balance); // SyntaxError
~~~

Why they matter:
- they provide real encapsulation
- outside code cannot directly change internal state
- they are safer than old naming conventions like \`_balance\`

~~~text
_balance  -> just a convention
#balance  -> actual language-level privacy
~~~

Easy analogy:
- public field = shop front door
- private field = locker room behind the staff door

Interview point:
Before private fields, developers used closures or naming conventions for privacy. Now JavaScript has built-in private fields with \`#\`.`,
        },
      ],
      tip: "When asked about classes, mention that methods live on the prototype and class is mostly syntax sugar.",
      rajnishAngle:
        "Good place to relate React class components vs modern function components, and how class methods used to be bound.",
    },
    {
      title: "this Keyword Deep Dive",
      subtopics: [
        "global vs function vs method call",
        "call/apply/bind",
        "arrow functions",
        "lost this",
        "constructor this",
      ],
      questions: [
        {
          q: "How is this decided in JavaScript?",
          answer: `In JavaScript, \`this\` is usually decided by how a function is called, not where it is written.

The 4 common rules:

~~~text
1. new Fn()        -> this = new object
2. obj.fn()        -> this = obj
3. fn.call(x)      -> this = x
4. plain fn()      -> this = undefined in strict mode
~~~

~~~js
function show() {
  console.log(this);
}

const user = {
  name: "Raj",
  greet() {
    console.log(this.name);
  },
};

show(); // undefined in strict mode
user.greet(); // "Raj"
show.call({ role: "admin" }); // { role: "admin" }
~~~

Easy analogy:
\`this\` is like the current caller badge. Whoever calls the function decides which badge it gets.

Important exception:
- arrow functions do not get their own \`this\`
- they capture \`this\` from surrounding scope

Interview one-liner:
"In regular functions, this is call-site based. In arrow functions, this is lexical."`,
        },
        {
          q: "What is the difference between call, apply, and bind?",
          answer: `All three let you control the value of \`this\` for a function.

~~~js
function introduce(city, country) {
  return this.name + " from " + city + ", " + country;
}

const user = { name: "Raj" };

console.log(introduce.call(user, "Pune", "India"));
console.log(introduce.apply(user, ["Pune", "India"]));

const boundFn = introduce.bind(user, "Pune", "India");
console.log(boundFn());
~~~

Difference:
- \`call\` -> calls immediately, arguments passed one by one
- \`apply\` -> calls immediately, arguments passed as array
- \`bind\` -> does not call immediately, returns a new function

~~~text
call  -> run now
apply -> run now
bind  -> run later
~~~

Easy analogy:
- \`call\` = call right now
- \`apply\` = call right now with an argument list
- \`bind\` = prepare a pre-configured function for later use

Why \`bind\` matters:
It solves the classic "lost this" problem in callbacks.

~~~js
const user2 = {
  name: "Raj",
  greet() {
    console.log(this.name);
  },
};

setTimeout(user2.greet.bind(user2), 100);
~~~

Without \`bind\`, \`this\` would be lost when the callback runs.`,
        },
        {
          q: "Why do arrow functions behave differently with this?",
          answer: `Arrow functions do not create their own \`this\`. They capture \`this\` from the surrounding lexical scope.

~~~js
const user = {
  name: "Raj",
  regular() {
    console.log(this.name);
  },
  arrow: () => {
    console.log(this.name);
  },
};

user.regular(); // "Raj"
user.arrow();   // usually undefined
~~~

Why?
- regular method -> \`this\` comes from the call site \`user.regular()\`
- arrow function -> ignores the object call site and keeps outer \`this\`

This is why arrows are great inside callbacks:

~~~js
class Timer {
  count = 0;

  start() {
    setInterval(() => {
      this.count++;
      console.log(this.count);
    }, 1000);
  }
}
~~~

The arrow callback keeps the class instance's \`this\`.

Best interview line:
"Arrow functions don't bind their own this; they inherit it from the surrounding scope."`,
        },
      ],
      tip: "If you get a `this` question, first identify how the function is called before answering.",
      rajnishAngle:
        "Useful for explaining old React class handlers, event callbacks, and why arrow callbacks felt easier.",
    },
    {
      title: "OOP Concepts in JavaScript",
      subtopics: [
        "encapsulation",
        "inheritance",
        "polymorphism",
        "abstraction",
        "composition vs inheritance",
      ],
      questions: [
        {
          q: "How do the four OOP pillars apply in JavaScript?",
          answer: `The four OOP pillars are encapsulation, inheritance, polymorphism, and abstraction. JavaScript supports them, but in its own prototype-based style.

1. Encapsulation
Keep data and related methods together, and hide internal details.

~~~js
class Counter {
  #count = 0;

  increment() {
    this.#count++;
  }

  value() {
    return this.#count;
  }
}
~~~

2. Inheritance
One class can reuse behavior from another.

~~~js
class Animal {
  speak() {
    return "sound";
  }
}

class Dog extends Animal {
  speak() {
    return "woof";
  }
}
~~~

3. Polymorphism
Different objects respond to the same method name differently.

~~~js
const animals = [new Animal(), new Dog()];
animals.forEach((a) => console.log(a.speak()));
~~~

4. Abstraction
Expose only what the user needs, hide the messy internal logic.

~~~text
car.drive()
You use it without caring how the engine works internally.
~~~

Interview-friendly summary:
"JavaScript supports OOP pillars through classes, prototypes, private fields, method overriding, and object composition."`,
        },
        {
          q: "What is the difference between inheritance and composition?",
          answer: `Inheritance means one class extends another. Composition means building objects by combining smaller pieces of behavior.

Inheritance:

~~~js
class Animal {
  eat() {
    return "eating";
  }
}

class Dog extends Animal {
  bark() {
    return "woof";
  }
}
~~~

Composition:

~~~js
const canEat = {
  eat() {
    return "eating";
  },
};

const canBark = {
  bark() {
    return "woof";
  },
};

const dog = Object.assign({}, canEat, canBark);
~~~

Why many developers prefer composition:
- less tight coupling
- easier to mix behaviors
- avoids deep inheritance chains
- more flexible in React and modern JS codebases

~~~text
inheritance -> "is-a"
composition -> "has-a" / "built-from"
~~~

Easy analogy:
- inheritance = child inherits family traits
- composition = building with Lego blocks

Senior interview answer:
"Use inheritance when there is a clear is-a relationship, but prefer composition for flexibility and easier maintenance."`,
        },
        {
          q: "What is method overriding in JavaScript?",
          answer: `Method overriding happens when a child class provides its own version of a method that already exists in the parent class.

~~~js
class Animal {
  speak() {
    return "generic sound";
  }
}

class Cat extends Animal {
  speak() {
    return "meow";
  }
}

console.log(new Cat().speak()); // "meow"
~~~

You can also call the parent implementation using \`super\`.

~~~js
class Bird extends Animal {
  speak() {
    return super.speak() + " chirp";
  }
}
~~~

Why it matters:
- this is a common form of polymorphism
- same method name, different behavior
- useful when child classes need customized logic

~~~text
parent method exists
child method replaces it
optional: child can still use parent via super
~~~

Common interview line:
"Overriding means redefining a parent method in a child class to provide specialized behavior."`,
        },
      ],
      tip: "Interviewers like hearing `composition over inheritance` because it shows practical design judgment, not just theory.",
      rajnishAngle:
        "Good link to component design too: React often prefers composition over big inheritance trees.",
    },
    {
      title: "Constructors, new, super & Interview Traps",
      subtopics: [
        "constructor function vs class constructor",
        "new keyword",
        "super",
        "instanceof",
        "common interview mistakes",
      ],
      questions: [
        {
          q: "What does the new keyword do in JavaScript?",
          answer: `The \`new\` keyword creates an object using a constructor function or class.

Under the hood, \`new\` roughly does 4 things:

~~~text
1. create a fresh object
2. connect it to the constructor's prototype
3. call the constructor with this = that new object
4. return the object
~~~

~~~js
function User(name) {
  this.name = name;
}

const u = new User("Raj");
console.log(u.name); // Raj
~~~

Without \`new\`, the behavior changes:

~~~js
function User2(name) {
  this.name = name;
}

// User2("Raj"); // bad in strict mode, wrong this binding
~~~

Easy analogy:
\`new\` is like saying: "Create a fresh object and run this setup code on it."

Interview one-liner:
"new creates an object, links its prototype, binds this, runs the constructor, and returns the object."`,
        },
        {
          q: "What is super in JavaScript classes?",
          answer: `\`super\` is used inside child classes to access the parent class.

It has two common uses:
- call the parent constructor
- call parent methods

~~~js
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    return this.name + " makes a sound";
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);
    this.breed = breed;
  }

  speak() {
    return super.speak() + " and barks";
  }
}
~~~

Very important rule:
In a derived class constructor, you must call \`super()\` before using \`this\`.

~~~js
class A {}
class B extends A {
  constructor() {
    super();
    this.x = 1;
  }
}
~~~

If you try to use \`this\` before \`super()\`, JavaScript throws an error.

Best short answer:
"super gives access to the parent class and is required before using this inside a child constructor."`,
        },
        {
          q: "How does instanceof work in JavaScript?",
          answer: `\`instanceof\` checks whether an object's prototype chain contains a constructor's \`.prototype\`.

~~~js
class Animal {}
class Dog extends Animal {}

const d = new Dog();

console.log(d instanceof Dog);    // true
console.log(d instanceof Animal); // true
~~~

Why is \`d instanceof Animal\` true?
Because the prototype chain goes through \`Dog.prototype\` and then \`Animal.prototype\`.

~~~text
d -> Dog.prototype -> Animal.prototype -> Object.prototype
~~~

This is not checking the class name string. It is checking the prototype chain.

Interview trap:
\`instanceof\` can fail across realms, like different browser windows/iframes, because each realm has its own constructors.

Short answer:
"instanceof checks whether Constructor.prototype exists somewhere in the object's prototype chain."`,
        },
      ],
      tip: "When explaining `new` or `instanceof`, always mention the prototype chain. That is usually the real concept being tested.",
      rajnishAngle:
        "Helpful for explaining class-based SDK wrappers, service objects, and older frontend architecture patterns.",
    },
  ],
};
