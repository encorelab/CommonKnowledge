class CK.Smartboard.View extends Sail.App
    @findOrCreate: (parent, selector, html) ->
        el = parent.find(selector)
        return el if el.length > 0
        el = jQuery(html)
        parent.append(el)
        return el


class CK.Smartboard.View.ContributionBubble extends Backbone.View
    tagName: 'article'

    initialize: =>
        # make this View accessible from the element
        @$el.data('view', @)

    render: =>
        @$el.addClass 'balloon contribution'
        @$el.attr 'id', @domID()

        headline = @findOrCreate '.headline', 
            "<h3 class='headline'></h3>"
        headline.text @model.get('headline')

        body = @findOrCreate '.body', 
            "<div class='body'></div>"
        body.text @model.get('body')

        meta = @findOrCreate '.meta',
            "<div class='meta'><span class='author'></span></div>"
        meta.find('.author')
            .text(@model.get('author'))
            .addClass("author-#{@model.get('author')}")


        @renderTags()

        # check if element is in DOM; if not, insert it
        unless @$el.parent().length > 0
            @$el.addClass('new')
            @$el.draggable
                stop: (ev, ui) =>
                    @model.save
                        pos: ui.position
                    return true # must return true, otherwise draggable is disabled
            jQuery('#wall').append(@$el)

        return @ # return this for chaining

    renderTags: =>
        tagsContainer = @findOrCreate '.tags',
            "<div class='tags'></div>"

        validTagClasses = []
        for tagText in @model.get('tags')
            # hacky way to convert the tag into something that can be used as a CSS clas
            md5tag = MD5.hexdigest(tagText)
            tagClass = "tag-#{md5tag}"
            validTagClasses.push tagClass 
            tagSpan = CK.Smartboard.View.findOrCreate tagsContainer, ".#{tagClass}",
                "<span class='tag #{tagClass}></span>"
            tagSpan.text tagText

        # now remove tags that are no longer present in the model
        tagsContainer.find('.tag').not(validTagClasses.join(",")).remove()

        return @ # return this for chaining

    domID: =>
        "contribution-#{@model.id}"

    findOrCreate: (selector, html) => 
        CK.Smartboard.View.findOrCreate @$el, selector, html