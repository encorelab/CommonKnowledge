class CK.Smartboard.View.WordCloud extends CK.Smartboard.View.Base

    render: =>
        words = []
        
        # call function that returns an array with all words to consider for the cloud
        @gatherWordsForCloud words, (gatheredWords) =>
            words = gatheredWords
            #filteredWords = w for w in words when not (stopWords.test(w) or punctuation.test(w))
            filteredWords = @filterWords (words)
            console.log filteredWords

            # count the occurance of each word and create a hash with word and count {word1: 3}
            wordCount = {}
            for w in filteredWords
                wordCount[w] ?= 0
                wordCount[w]++

            # Now some math to calculate the size of a word depending on it's occurance (count)
            maxSize = 70
            # maxCount = _.max wordCount, (count,word) -> count
            maxCount = _.max(_.pairs(wordCount), (wc) -> wc[1])
            console.log maxCount, wordCount
            wordHash = for word,count of wordCount
                h = {text: word, size: Math.pow(count / maxCount[1], 0.5) * maxSize}
                console.log word,count,h
                h
                
            # call the function that actually generates the word cloud
            @generate(wordHash)
            # make the object holding the word-cloud and the overlay visible
            wordCloud = jQuery('#word-cloud')
            # add z-index greater than bubbles
            zIndex = @maxBallonZ() + 1
            wordCloud.addClass('visible')
            wordCloud.css('z-index', zIndex)
            fade = jQuery('#fade')
            fade.addClass('visible')

    gatherWordsForCloud: (wordsToReturn, callback) =>
        punctuation = /[!"&()*+,-\.\/:;<=>?\[\\\]^`\{|\}~]+/g
        wordSeparators = /[\s\u3031-\u3035\u309b\u309c\u30a0\u30fc\uff70]+/g
        text = ''
        
        @contributions = new CK.Model.Contributions()
        @contributions.fetch success: (collection, response) =>
            _.each collection.models, (c) ->
                if c.get('published')
                    console.log c.get('headline'), c.get('content')
                    text += c.get('headline') + ' '
                    text += c.get('content') + ' '
            _.each text.split(wordSeparators), (word) ->
                word = word.replace(punctuation, "")
                wordsToReturn.push(word)
            callback (wordsToReturn)


    filterWords: (wordsToFilter) ->
        stopWords = /^(i|me|my|myself|we|us|our|ours|ourselves|you|your|yours|yourself|yourselves|he|him|his|himself|she|her|hers|herself|it|its|itself|they|them|their|theirs|themselves|what|which|who|whom|whose|this|that|these|those|am|is|are|was|were|be|been|being|have|has|had|having|do|does|did|doing|will|would|should|can|could|ought|i'm|you're|he's|she's|it's|we're|they're|i've|you've|we've|they've|i'd|you'd|he'd|she'd|we'd|they'd|i'll|you'll|he'll|she'll|we'll|they'll|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|doesn't|don't|didn't|won't|wouldn't|shan't|shouldn't|can't|cannot|couldn't|mustn't|let's|that's|who's|what's|here's|there's|when's|where's|why's|how's|a|an|the|and|but|if|or|because|as|until|while|of|at|by|for|with|about|against|between|into|through|during|before|after|above|below|to|from|up|upon|down|in|out|on|off|over|under|again|further|then|once|here|there|when|where|why|how|all|any|both|each|few|more|most|other|some|such|no|nor|not|only|own|same|so|than|too|very|say|says|said|shall|sd|sdf|fuck|shit|poo|pooped|boop|boops|asshole|undefined)$/i
        # punctuation = /[!"&()*+,-\.\/:;<=>?\[\\\]^`\{|\}~]+/g
        # wordSeparators = /[\s\u3031-\u3035\u309b\u309c\u30a0\u30fc\uff70]+/g
        discard = /^(@|https?:)/
        htmlTags = /(<[^>]*?>|<script.*?<\/script>|<style.*?<\/style>|<head.*?><\/head>)/g
        filteredWords = _.filter wordsToFilter, (w) -> not (stopWords.test(w))
        filteredWords2 = _.filter(filteredWords, (w) ->
            w isnt ""
        )
        return filteredWords2


    hide: =>
        wordCloud = jQuery('#word-cloud')
        wordCloud.removeClass('visible')
        fade = jQuery('#fade')
        fade.removeClass('visible')
        jQuery('#word-cloud svg').remove()

    generate: (wordHash) ->
        fadeDiv = jQuery('#fade')
        width = fadeDiv.width() #650
        height = fadeDiv.height() #400
        wordCloud = jQuery('#word-cloud')
        wordCloud.height(height + 'px')
        wordCloud.width(width + 'px')

        #alert height
        #alert width
        draw = (words) ->
            d3.select("#word-cloud")
            .append("svg")
            .attr("width", "99%")
            .attr("height", "99%")
            .append("g")
            .attr("transform", "translate(#{width/2},#{height/2})")
            .selectAll("text")
            .data(words)
            .enter()
            .append("text")
            .style("font-size", (d) ->
                d.size + "px"
            ).style("font-family", "Ubuntu")
            .style("fill", (d, i) ->
                fill i
            ).attr("text-anchor", "middle")
            .attr("transform", (d) ->
                "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")"
            ).text (d) ->
                d.text

        fill = d3.scale.category20()
        d3.layout.cloud().size([width, height]).words(wordHash).rotate(->
            ~~(Math.random() * 5) * 30 - 60
            # ~~(Math.random() * 2) * 90
        ).font("Ubuntu").fontSize((d) ->
            d.size
        ).on("end", draw).start()

        # enable the clicking of the button once the word cloud is rendered
        wordCloudObject = jQuery('#show-word-cloud')
        wordCloudObject.text('Hide Word Cloud')
        wordCloudObject.removeClass('disabled')

    maxBallonZ: ->
        _.max jQuery("*").map((el) ->
            parseInt jQuery(this).zIndex()
        )