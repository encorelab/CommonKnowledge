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


    domID: => @model.id

    # these are used in CK.Smartboard.View.BalloonCloud
    leftToX: (left) => left + @$el.outerWidth() / 2
    topToY: (top) => top + @$el.outerHeight() / 2
    xToLeft: (x) => x - @$el.outerWidth() / 2
    yToTop: (y) => y - @$el.outerHeight() / 2
        
        



