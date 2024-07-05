<script>
  export let wordLength;
  export let wordToGuess;
  export let word;
</script>

<div class="row-container">
  {#each Array.from({ length: wordLength }) as _, i}
    <div
      class="letter-box {word &&
      word.length === wordLength &&
      word[i] === wordToGuess[i]
        ? 'correct-letter'
        : ''}"
    >
      {word && word.length > i ? word[i] : ""}
    </div>
  {/each}
</div>

<style>
  .row-container {
    display: flex;
    flex-direction: row;
  }

  .letter-box {
    width: 40px;
    height: 40px;
    border: 1px solid black;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .correct-letter {
    background-color: greenyellow;
  }
</style>
