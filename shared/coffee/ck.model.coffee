class CK.Model
    @init: (url, db) ->
        deferredConfigure = $.Deferred()

        unless url?
            throw "Cannot configure model because no DrowsyDromedary URL was given!"
        unless db?
            throw "Cannot configure model because no database name was given!"

        @baseURL = url 
        @dbURL= "#{url}/#{db}"

        @server = new Drowsy.Server(url)
        @db = @server.database(db)

        @createNecessaryCollections([
            'contributions',
            'tags',
            'states'
        ]).then =>
            @defineModelClasses()

            # create required items
            tags = new CK.Model.Tags()
            tags.fetch
                success: (tags) =>
                    # if tags.find( (t) => t.get('name') is "N/A" )
                    #     console.log("Not creating 'N/A' tag because it already exists")
                    # else
                    #     console.log("Creating 'N/A' tag...")
                    #     tag = new CK.Model.Tag()
                    #     tag.set('name', "N/A")
                    #     tag.save()

                    deferredConfigure.resolve()

        return deferredConfigure
                    

    @createNecessaryCollections: (requiredCollections) ->
        dfs = []
        df = $.Deferred()

        @db.collections (colls) =>
            existingCollections = _.pluck(colls, 'name')
        
            for col in requiredCollections
                unless col in existingCollections
                    console.log "Creating collection '#{col}' under #{CK.Model.dbURL}";
                    dfs.push(@db.createCollection col)

        $.when.apply($, dfs).done -> df.resolve()
        return df

        # jQuery.ajax CK.Model.dbURL,
        #     type: 'get',
        #     dataType: 'json',
        #     success: (existingCollections) =>
        #         for col in requiredCollections
        #             unless col in existingCollections
        #                 console.log "Creating collection '#{col}' under #{CK.Model.dbURL}";
        #                 jQuery.post CK.Model.dbURL,
        #                     collection: col
        #     error: (err) =>
        #         console.error "Couldn't fetch list of collections from #{CK.Model.dbURL} because: ", JSON.parse(err.responseText)
        #         throw err.responseText


    @defineModelClasses: ->
        class @Contribution extends @db.Document('contributions')

            initialize: =>
                super()
                unless @get('created_at')
                    @set 'created_at', new Date()

            get: (attr) =>
                val = super(attr)
                # previous versions of CK did not store created_at as a proper ISODate
                if attr is 'created_at'
                    unless val instanceof Date
                        date = new Date(val)
                        unless isNaN date.getTime()
                            val = date
                
                return val
            
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
                    return @

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


        class @Contributions extends @db.Collection('contributions')
            model: CK.Model.Contribution

        class @Tag extends @db.Document('tags')

        class @Tags extends @db.Collection('tags')
            model: CK.Model.Tag

        class @State extends @db.Document('states')

        class @States extends @db.Collection('states')
            model: CK.Model.State

        class @UserState extends @db.Document('user_states')

        class @UserStates extends @db.Collection('user_states')
            model: CK.Model.UserState
            
