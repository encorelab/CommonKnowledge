if typeof exports isnt "undefined" and exports isnt null
  # we're in node
  $ = require("jquery")
  _ = require("underscore")
  Backbone = require("backbone")
  Backbone.$ = $
  Drowsy = require("backbone.drowsy").Drowsy
  
  #var Wakeful = require('Backbone.Drowsy/wakeful').Wakeful;
  CK = {}
  exports.CK = CK
else
  window.CK = window.CK or {}
  CK = window.CK
  $ = window.$
  _ = window._
  Drowsy = window.Drowsy

class CK.Model
    @requiredCollections = [
        'contributions',
        'tags',
        'states',
        'proposals'
    ]

    @init: (url, db) ->
        deferredConfigure = $.Deferred()

        unless url?
            throw new Error "Cannot configure model because no DrowsyDromedary URL was given!"
        unless db?
            throw new Error "Cannot configure model because no database name was given!"

        @baseURL = url
        @dbURL= "#{url}/#{db}"

        @server = new Drowsy.Server(url)
        @db = @server.database(db)

        @createNecessaryCollections(@requiredCollections).then =>
            @defineModelClasses()
            deferredConfigure.resolve()

        return deferredConfigure
                    

    @createNecessaryCollections: (requiredCollections) ->
        dfs = []
        df = $.Deferred()

        @db.collections (colls) =>
            existingCollections = _.pluck(colls, 'name')
        
            for col in requiredCollections
                unless col in existingCollections
                    console.log "Creating collection '#{col}' under #{CK.Model.dbURL}"
                    dfs.push(@db.createCollection col)

        $.when.apply($, dfs).done -> df.resolve()
        return df


    @defineModelClasses: ->

        class @Contribution extends @db.Document('contributions')
            
            addTag: (tag, tagger) =>
                unless tag instanceof CK.Model.Tag
                    console.error("Cannot addTag ", tag ," because it is not a CK.Model.Tag instance!")
                    throw "Invalid tag (doesn't exist)"

                unless tag.id
                    console.error("Cannot addTag ", tag ," to contribution ", @ ," because it doesn't have an id!")
                    throw "Invalid tag (no id)"

                existingTagRelationships = @get('tags') || []

                if _.any(existingTagRelationships, (tr) => tr.id is tag.id)
                    console.warn("Cannot addTag ", tag ," to contribution ", @ , " because it already has this tag.")
                    return this

                tagRel =
                    id: tag.id
                    name: tag.get('name')
                    tagger: tagger
                    tagged_at: new Date()


                existingTagRelationships.push(tagRel)

                @set 'tags', existingTagRelationships

                return @

            removeTag: (tag, tagger) =>
                reducedTags = _.reject @get('tags'), (t) =>
                    (t.id is tag.id || t.name is tag.get('name')) and
                        (not tagger? || t.tagger is tagger)

                @set('tags', reducedTags)

            hasTag: (tag, tagger) =>
                _.any @get('tags'), (t) =>
                    t.id is tag.id and
                        (not tagger? || t.tagger is tagger)


        class @Proposal extends @db.Document('proposals')
                    
            addTag: (tag) =>
                unless tag instanceof CK.Model.Tag
                    console.error("Cannot addTag ", tag ," because it is not a CK.Model.Tag instance!")
                    throw "Invalid tag (doesn't exist)"

                unless tag.id
                    console.error("Cannot addTag ", tag ," to contribution ", @ ," because it doesn't have an id!")
                    throw "Invalid tag (no id)"

                existingTagID = @get('tag_group_id') || null

                if existingTagID is tag.id
                    console.warn("Cannot addTag ", tag ," to contribution ", @ , " because it already has this tag.")
                    return @


                @set 'tag_group_name', tag.name
                @set 'tag_group_id', tag.id

                return @

            removeTag: (tag) =>
                tagID = @get('tag_group_id')
                tagName = @get('tag_group_name')
               

                if tagID is tag.id || tagName is tag.name
                    @set('tag_group_id', null)
                    @set('tag_group_name', null)

            hasTag: (tag) =>
                tagID = @get('tag_group_id')
                if tag.id is tagID
                    true
                else
                    false
                

        class @Contributions extends @db.Collection('contributions')
            model: CK.Model.Contribution

        class @Proposals extends @db.Collection('proposals')
            model: CK.Model.Proposal

        class @Tag extends @db.Document('tags')

        class @Tags extends @db.Collection('tags')
            model: CK.Model.Tag

        class @State extends @db.Document('states')

        class @States extends @db.Collection('states')
            model: CK.Model.State

    @initWakefulCollections = (wakefulUrl) ->
        deferreds = []

        camelCase = (str) ->
            str.replace(/([\-_][a-z]|^[a-z])/g, ($1) -> $1.toUpperCase().replace(/[\-_]/,''))

        @awake = {}

        for collName in @requiredCollections
            coll = new @[camelCase(collName)]()
            coll.wake wakefulUrl
            @awake[collName] = coll
            deferreds.push coll.fetch()

        $.when.apply jQuery, deferreds
            
