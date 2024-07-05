<script>
  import LetterBoxContainer from "./LetterBoxContainer.svelte";
  import { onMount, onDestroy } from "svelte";

  const wordLength = 5;
  const numRows = 5;
  let currGuess = "";
  let guessList = [];
  let wordToGuess = "trick";
  let userWin = false;

  function handleReset() {
    userWin = false;
    currGuess = "";
    guessList = [];
  }

  function handleKeydown(event) {
    if (userWin) return;
    const key = event.key;
    if (key === "Backspace") {
      currGuess = currGuess.slice(0, -1);
    } else if (currGuess.length < wordLength && /^[a-zA-Z]$/.test(key)) {
      currGuess += key;
    }

    if (currGuess.length === wordLength) {
      if (currGuess === wordToGuess) userWin = true;
      guessList.push(currGuess);
      currGuess = "";
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
    {numRows}
    {currGuess}
    {guessList}
    {wordToGuess}
  />
  {#if userWin}
    <div>You win!</div>
    <button on:click={handleReset}>Play Again</button>
  {/if}
</div>

<style>
  .top-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
</style>
