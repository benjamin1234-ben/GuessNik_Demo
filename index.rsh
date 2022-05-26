'reach 0.1';

const game = (askerNumber, guesserNumber) => {
    const a = askerNumber;
    const b = guesserNumber;
    
    if(askerNumber >= guesserNumber) {
        return (10 - (a - b)) * 10;
    } else {
        return (10 - (b - a)) * 10;
    };
};

const Player = {
    ...hasRandom,
    getNumber: Fun([], UInt),
    seeOutcome: Fun([UInt], Null),
    seeNumbers: Fun([UInt, UInt], Null),
    informTimeout: Fun([], Null)
};

export const main = Reach.App(() => {
    const Asker = Participant('Asker', {
        ...Player,
        wager: UInt,
        deadline: UInt,
    });
    const Guesser = Participant('Guesser', {
        ...Player,
        acceptWager: Fun([UInt], Null),
    });
    init();

    const informTimeout = () => {
        each([Asker, Guesser], () => {
        interact.informTimeout();
        });
    };

    Asker.only(() => {
        const wager = declassify(interact.wager);
        const deadline = declassify(interact.deadline);
    });

    Asker.publish(wager, deadline).pay(wager);

    commit();

    Guesser.only(() => {
        interact.acceptWager(wager);
    });

    Guesser.pay(wager).timeout(relativeTime(deadline), () => closeTo(Asker, informTimeout));

    Asker.only(() => {
      const _askerNumber = interact.getNumber();
      const [_commitAsker, _saltAsker] = makeCommitment(interact, _askerNumber);
      const commitAsker = declassify(_commitAsker);
    });
 
    commit();

    Asker.publish(commitAsker).timeout(relativeTime(deadline), () => closeTo(Guesser, informTimeout));

    commit();

    unknowable(Guesser, Asker(_askerNumber, _saltAsker));

    Guesser.only(() => {
      const guesserNumber = declassify(interact.getNumber());
    });

    Guesser.publish(guesserNumber).timeout(relativeTime(deadline), () => closeTo(Asker, informTimeout));

    commit();

    Asker.only(() => {
      const saltAsker = declassify(_saltAsker);
      const askerNumber = declassify(_askerNumber);
    });

    Asker.publish(saltAsker, askerNumber).timeout(relativeTime(deadline), () => closeTo(Guesser, informTimeout));

    checkCommitment(commitAsker, saltAsker, askerNumber);

    const outcome = game(askerNumber, guesserNumber);

    const guesserAmount = outcome * 2 * wager / 100;

    const askerAmount = balance() - guesserAmount;

    transfer(guesserAmount).to(Guesser);
    transfer(askerAmount).to(Asker);

    commit();

    each([Asker, Guesser], () => {
        interact.seeOutcome(outcome);
        interact.seeNumbers(askerNumber, guesserNumber);
    });
});