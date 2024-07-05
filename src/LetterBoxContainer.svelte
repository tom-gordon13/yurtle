<script>
    import LetterBoxRow from "./LetterBoxRow.svelte";

    export let wordLength;
    export let numRows;
    export let currGuess;
    export let guessList;
    export let wordToGuess;
</script>

<div class="box-container">
    {#each Array.from({ length: numRows }) as _, i}
        <LetterBoxRow
            {wordLength}
            {wordToGuess}
            word={i === guessList.length ? currGuess : guessList[i]}
        ></LetterBoxRow>
    {/each}
</div>

<style>
    .box-container {
        padding: 1rem;
    }
</style>
