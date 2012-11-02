class CK.Smartboard.View
    @findOrCreate: (parent, selector, html) ->
        el = parent.find(selector)
        return el if el.length > 0
        el = jQuery(html)
        parent.append(el)
        return el


class CK.Smartboard.View.Base extends Backbone.View
    findOrCreate: (selector, html) => 
        CK.Smartboard.View.findOrCreate @$el, selector, html

    corporealize: ->
        @$el.hide() # hide until positioned

        # check if element is in DOM; if not, insert it
        unless @$el.parent().length > 0
            if @model.justAdded
                @$el.addClass('new')
                delete @model.justAdded
            @$el.draggable
                stop: (ev, ui) =>
                    @model.save
                        pos: ui.position
                    return true # must return true, otherwise draggable is disabled
            @$el.css('position', 'absolute') # draggable() makes them 'relative' on webkit for some reason, which breaks shit
            jQuery('#wall').append(@$el)

        if @model.has('pos')
            @$el.css
                left: @model.get('pos').left + 'px'
                top: @model.get('pos').top + 'px'
        else
            @autoPosition()

        @$el.show()

    autoPosition: ->
        wallWidth = jQuery('#wall').width()
        wallHeight = jQuery('#wall').height()

        left = Math.random() * (wallWidth - @$el.width())
        top = Math.random() * (wallHeight - @$el.height())

        @$el.css
            left: left + 'px'
            top: top + 'px'

        @model.save {pos: {left: left, top: top}}

class CK.Smartboard.View.Wall extends CK.Smartboard.View.Base
    tagName: 'div'
    id: 'wall'

    submitNewTag: ->
        newTag = @$el.find('#new-tag').val()
        Sail.app.createNewTag(newTag)
        @$el.find('#add-tag-container')
            .removeClass('opened')
            .blur()
        @$el.find('#new-tag').val('')

    events:
        # 'click #tags-tab': (ev) ->
        #     jQuery('#tags-panel').css('left', '0px')

        'click #add-tag-opener': (ev) ->
            addTagContainer = @$el.find('#add-tag-container')
            addTagContainer.toggleClass('opened')
            if addTagContainer.hasClass('opened')
                setTimeout(=> 
                    @$el.find('#new-tag').focus()
                , 1000)

        'click #submit-new-tag': (ev) -> @submitNewTag()
            

        'keydown #new-tag': (ev) -> @submitNewTag() if ev.keyCode is 13
    

class CK.Smartboard.View.ContributionBubble extends CK.Smartboard.View.Base
    tagName: 'article'
    className: 'contribution balloon'
    id: => @domID()

    # initialize: =>
    #     # make this View accessible from the element
    #     @$el.data('view', @)

    render: =>
        headline = @findOrCreate '.headline', 
            "<h3 class='headline'></h3>"
        headline.text @model.get('headline')

        body = @findOrCreate '.body', 
            "<div class='body'></div>"

        if @model.get('content_type') is 'text'
            body.text @model.get('content')
        else
            body.text @model.get('content')
            # console.warn "Contribution #{@model.id} has an unrecognized content type: ", @model.get('content_type'), " ... assuming 'text'."

        meta = @findOrCreate '.meta',
            "<div class='meta'><span class='author'></span></div>"
        meta.find('.author')
            .text(@model.get('author'))
            .addClass("author-#{@model.get('author')}")


        # @renderTags()
        
        @corporealize()

        return @ # return this for chaining

    # renderTags: =>
    #     tagsContainer = @findOrCreate '.tags',
    #         "<div class='tags'></div>"

    #     return unless @model.get('tags')?

    #     validTagClasses = []
    #     for tagText in @model.get('tags')
    #         # hacky way to convert the tag into something that can be used as a CSS clas
    #         md5tag = MD5.hexdigest(tagText)
    #         tagClass = "tag-#{md5tag}"
    #         validTagClasses.push tagClass 
    #         tagSpan = CK.Smartboard.View.findOrCreate tagsContainer, ".#{tagClass}",
    #             "<span class='tag #{tagClass}></span>"
    #         tagSpan.text tagText

    #     # now remove tags that are no longer present in the model
    #     tagsContainer.find('.tag').not(validTagClasses.join(",")).remove()

    #     return @ # return this for chaining

    domID: =>
        "contribution-#{@model.id}"


class CK.Smartboard.View.TagBubble extends CK.Smartboard.View.Base
    tagName: 'div'
    className: 'tag balloon'
    id: => @domID()

    render: => 
        name = @findOrCreate '.name', 
            "<h3 class='name'></h3>"
        name.text @model.get('name')

        @corporealize()

        @$el.show()

        return @ # return this for chaining


    domID: =>
        "tag-#{@model.id}"
