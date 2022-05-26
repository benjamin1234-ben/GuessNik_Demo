import { loadStdlib, ask } from '@reach-sh/stdlib';
import * as backend from './build/index.main.mjs';
const stdlib = loadStdlib();
stdlib.setProviderByName("LocalHost");

const isAsker = await ask.ask(
  `Are you the Asker?`,
  ask.yesno
);
const who = isAsker ? 'Asker' : 'Guesser';

console.log(`Starting Guessnik! as ${who}`);

let acc = null;
const createAcc = await ask.ask(
  `Would you like to create an account? (only possible on devnet)`,
  ask.yesno
);
if (createAcc) {
  acc = await stdlib.newTestAccount(stdlib.parseCurrency(10000));
} else {
  const secret = await ask.ask(
    `What is your account secret?`,
    (x => x)
  );
  acc = await stdlib.newAccountFromSecret(secret);
}

let ctc = null;
if (isAsker) {
  ctc = acc.contract(backend);
  ctc.getInfo().then((info) => {
    console.log(`The contract is deployed as = ${JSON.stringify(info)}`); });
} else {
  const info = await ask.ask(
    `Please paste the contract information:`,
    JSON.parse
  );
  ctc = acc.contract(backend, info);
}

const fmt = (x) => stdlib.formatCurrency(x, 4);
const getBalance = async () => fmt(await stdlib.balanceOf(acc));

const before = await getBalance();
console.log(`Your balance is ${before}`);

const interact = { ...stdlib.hasRandom };

interact.informTimeout = () => {
  console.log(`There was a timeout.`);
  process.exit(1);
};

if (isAsker) {
  const amt = await ask.ask(
    `How much do you want to wager?`,
    stdlib.parseCurrency
  );
  interact.wager = amt;
  interact.deadline = { ETH: 100, ALGO: 100, CFX: 1000 }[stdlib.connector];
} else {
  interact.acceptWager = async (amt) => {
    const accepted = await ask.ask(
      `Do you accept the wager of ${fmt(amt)}?`,
      ask.yesno
    );
    if (!accepted) {
      process.exit(0);
    }
  };
}

const arrNum = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interact.getNumber = async () => {
  const number = await ask.ask(`What number will you play?`, (x) => {
    const number = x;
    if ( !arrNum.includes(number) ) {
      throw Error(`Not a valid number ${number}, Number must fall betwween the range of 0 - 10`);
    }
    return number;
  });
  console.log(`You played ${number}`);
  return number;
};

interact.seeOutcome = async (outcome) => {
  console.log(`The outcome is : You get ${outcome}% of the Guessnik pool`);
};
interact.seeNumbers = async (a, b) => {
  isAsker ? console.log(`Your number is ${a}, while your opponents number is ${b}`) : console.log(`Your number is ${b}, while your opponents number is ${a}`) 
}

const part = isAsker ? ctc.p.Asker : ctc.p.Guesser;
await part(interact);

const after = await getBalance();
console.log(`Your balance is now ${after}`);

ask.done();