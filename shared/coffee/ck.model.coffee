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

        CK.Model.createNecessaryCollections([
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



class CK.Model.Document extends Drowsy.Document

class CK.Model.Collection extends Drowsy.Collection
    model: CK.Model.Document


class CK.Model.Contribution extends CK.Model.Document
    
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


class CK.Model.Contributions extends CK.Model.Collection
    model: CK.Model.Contribution
    url: undefined  # set in CK.Model.configure()

class CK.Model.Tag extends CK.Model.Document
    urlRoot: undefined # set in CK.Model.configure()

class CK.Model.Tags extends CK.Model.Collection
    model: CK.Model.Tag
    url: undefined  # set in CK.Model.configure()

class CK.Model.State extends CK.Model.Document
    urlRoot: undefined # set in CK.Model.configure()

class CK.Model.States extends CK.Model.Collection
    model: CK.Model.State
    url: undefined # set in CK.Model.configure()
    
