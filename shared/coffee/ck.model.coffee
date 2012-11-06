class CK.Model
    @configure: (url, db) ->
        unless url?
            throw "Cannot configure model because no DrowsyDromedary URL was given!"
        unless db?
            throw "Cannot configure model because no database name was given!"

        @baseURL = url 
        @dbURL= "#{url}/#{db}"

        CK.Model.Contribution::urlRoot = "#{@dbURL}/contributions"
        CK.Model.Contributions::url = "#{@dbURL}/contributions"
        
        CK.Model.Tag::urlRoot = "#{@dbURL}/tags"
        CK.Model.Tags::url = "#{@dbURL}/tags"

        CK.Model.State::urlRoot = "#{@dbURL}/states"
        CK.Model.States::url = "#{@dbURL}/states"

        CK.Model.DrowsyModel.createNecessaryCollections([
            'contributions',
            'tags',
            'states'
        ])

        # create required items
        tags = new CK.Model.Tags()
        tags.fetch
            success: (tags) ->
                if tags.find( (t) -> t.get('name') is "N/A" )
                    console.log("Not creating 'N/A' tag because it already exists")
                else
                    console.log("Creating 'N/A' tag...")
                    tag = new CK.Model.Tag()
                    tag.set('name', "N/A")
                    tag.save()


# TODO: move this out to sail.js
class CK.Model.DrowsyModel extends Backbone.Model
    idAttribute: "_id"

    parse: (data) ->
        data._id = data._id.$oid
        if data.created_at?
            parsedCreatedAt = new Date(data.created_at)
            unless isNaN parsedCreatedAt.getTime()
                data.created_at = parsedCreatedAt
        return data

    initialize: ->
        unless @get(@idAttribute)
            @set @idAttribute, CK.Model.DrowsyModel.generateMongoObjectId()

        unless @get('created_at')
            @set 'created_at', Date()

    @generateMongoObjectId: ->
        base = 16 # hex
        randLength = 13
        time = Date.now().toString(base)
        rand = Math.ceil(Math.random() * (Math.pow(base, randLength)-1)).toString(base)
        return time + (Array(randLength+1).join("0") + rand).slice(-randLength)

    @createNecessaryDatabase: (requiredDatabase, afterwards) ->
        jQuery.ajax CK.Model.baseURL,
            type: 'get'
            dataType: 'json'
            success: (existingDatabases) ->
                if requiredDatabase in existingDatabases
                    afterwards()
                else
                    jQuery.post(CK.Model.baseURL, {db: requiredDatabase}, afterwards)
            error: (err) ->
                console.error  "Couldn't fetch list of databases because: ", 
                    JSON.parse err.responseText
                throw err.responseText

    @createNecessaryCollections: (requiredCollections) ->
        dbUrl = 
        jQuery.ajax CK.Model.dbURL,
            type: 'get',
            dataType: 'json',
            success: (existingCollections) =>
                for col in requiredCollections
                    unless col in existingCollections
                        console.log "Creating collection '#{col}' under #{CK.Model.dbURL}";
                        jQuery.post CK.Model.dbURL,
                            collection: col
            error: (err) =>
                console.error "Couldn't fetch list of collections from #{CK.Model.dbURL} because: ", JSON.parse(err.responseText)
                throw err.responseText

# TODO: move this out to sail.js
class CK.Model.DrowsyCollection extends Backbone.Collection
    model: CK.Model.DrowsyModel


class CK.Model.Contribution extends CK.Model.DrowsyModel
    urlRoot: undefined # set in CK.Model.setup()

    addTag: (tag, tagger) ->
        unless tag instanceof CK.Model.Tag
            console.error("Cannot addTag ", tag ," because it is not a CK.Model.Tag instance!")
            throw "Invalid tag (doesn't exist)"

        unless tag.id
            console.error("Cannot addTag ", tag ," to contribution ", @ ," because it doesn't have an id!")
            throw "Invalid tag (no id)"

        existingTagRelationships = @get('tags') || []

        if _.any(existingTagRelationships, (tr) -> tr.id is tag.id)
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

    removeTag: (tag, tagger) ->
        reducedTags = _.reject @get('tags'), (t) ->
            (t.id is tag.id || t.name is tag.get('name')) and
                (not tagger? || t.tagger is tagger)

        @set('tags', reducedTags)

    hasTag: (tag, tagger) ->
        _.any @get('tags'), (t) ->
            t.id is tag.id and
                (not tagger? || t.tagger is tagger)


class CK.Model.Contributions extends CK.Model.DrowsyCollection
    model: CK.Model.Contribution
    url: undefined  # set in CK.Model.configure()

class CK.Model.Tag extends CK.Model.DrowsyModel
    urlRoot: undefined # set in CK.Model.configure()

class CK.Model.Tags extends CK.Model.DrowsyCollection
    model: CK.Model.Tag
    url: undefined  # set in CK.Model.configure()

class CK.Model.State extends CK.Model.DrowsyModel
    urlRoot: undefined # set in CK.Model.configure()

class CK.Model.States extends CK.Model.DrowsyCollection
    model: CK.Model.State
    url: undefined # set in CK.Model.configure()
    
