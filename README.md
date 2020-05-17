# Instrument practice

https://instrument-practice.netlify.app

When you have a new instrument, you might not know where all the notes are. I just bought myself a button accordion and I'm very rusty.

This web app shows you a note and asks you to play it. It uses a monophonic pitch tracking algorithm to figure out which note you're playing. If you get it right, you get a new note.

You can set the range of notes for your instrument using the controls on the page. If you play a note outside of the range it won't show up.

Pitch tracking is handled by the [Web Assembly bindings](https://github.com/qiuxiang/aubiojs) of [Aubio](https://aubio.org/)'s implementation of [Yin](http://audition.ens.fr/adc/pdf/2002_JASA_YIN.pdf). It's not perfect, but works well enough for some instruments.
