<script>
  import LetterBoxContainer from "./LetterBoxContainer.svelte";
  import WinLossContainer from "./WinLossContainer.svelte";
  import { onMount, onDestroy } from "svelte";

  const wordLength = 5;
  const numAllowedGuesses = 6;
  let currGuess = "";
  let guessList = [];
  let wordToGuess = "trick";
  let gameState = null;

  function handleReset() {
    gameState = null;
    currGuess = "";
    guessList = [];
  }

  function checkWinLoss(currGuess, wordToGuess, numAllowedGuesses, guessList) {
    if (currGuess === wordToGuess) gameState = "win";
    guessList.push(currGuess);
    if (guessList.length === numAllowedGuesses && !gameState)
      gameState = "lose";
    return "";
  }

  function handleKeydown(event) {
    if (gameState) return;
    const key = event.key;
    if (key === "Backspace") {
      currGuess = currGuess.slice(0, -1);
    } else if (currGuess.length < wordLength && /^[a-zA-Z]$/.test(key)) {
      currGuess += key;
    }

    if (currGuess.length === wordLength) {
      currGuess = checkWinLoss(
        currGuess,
        wordToGuess,
        numAllowedGuesses,
        guessList,
      );
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener("keydown", handleKeydown);
  });
</script>

<div class="top-container" on:keydown={handleKeydown}>
  <LetterBoxContainer
    {wordLength}
    {numAllowedGuesses}
    {currGuess}
    {guessList}
    {wordToGuess}
  />
  <WinLossContainer {gameState} {handleReset} />
</div>

<style>
  .top-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
</style>
