class CK.Smartboard.View
    @findOrCreate: (parent, selector, html) ->
        el = jQuery(parent).find(selector)
        return el if el.length > 0
        el = jQuery(html)
        parent.append(el)
        return el


class CK.Smartboard.View.Base extends Backbone.View
    findOrCreate: (selector, html) => 
        CK.Smartboard.View.findOrCreate @$el, selector, html

    constructor: (options) ->
        super(options)

        
        # # check if element is in DOM; if not, insert it
        # unless @$el.parent().length > 0
        #     if @model.justAdded
        #         @$el.addClass('new')
        #         delete @model.justAdded
        #     # @$el.draggable
        #     #     stop: (ev, ui) =>
        #     #         @model.save
        #     #             pos: ui.position
        #     #         return true # must return true, otherwise draggable is disabled
        #     @$el.css('position', 'absolute') # draggable() makes them 'relative' on webkit for some reason, which breaks shit
        #     jQuery('#wall').append(@$el)

        alreadyPositioned = @$el.position().left? && @$el.position().left > 0

        if @model? and not alreadyPositioned
            @$el.hide() # hide until positioned
            if @model.has('pos')
                @$el.css
                    left: @model.get('pos').left + 'px'
                    top: @model.get('pos').top + 'px'
            else
                console.log("autopositioning", this)
                @autoPosition()

        # if @model
        #     @model.x ?= @$el.position().left if @$el.position().left > 0
        #     @model.y ?= @$el.position().top if @$el.position().top > 0

        @$el.show()

    autoPosition: ->
        wallWidth = jQuery('#wall').width()
        wallHeight = jQuery('#wall').height()

        left = Math.random() * (wallWidth - @$el.outerWidth())
        top = Math.random() * (wallHeight - @$el.outerHeight())

        @$el.css
            left: left + 'px'
            top: top + 'px'

        @model.save {pos: {left: left, top: top}}

    domID: => @model.id

    # these are used in CK.Smartboard.View.BalloonCloud
    leftToX: (left) => left + @$el.outerWidth() / 2
    topToY: (top) => top + @$el.outerHeight() / 2
    xToLeft: (x) => x - @$el.outerWidth() / 2
    yToTop: (y) => y - @$el.outerHeight() / 2
        
        



