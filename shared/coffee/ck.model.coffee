class CK.Model
    @setup: (config) ->
        unless config.run? and config.run.name?
            throw "Cannot configure model because config does not have a run.name!"

        config.drowsyURL = config.mongo.url + "/" + config.run.name

        CK.Model.config = config

        CK.Model.Contribution::urlRoot = config.drowsyURL + "/contributions"
        CK.Model.Contributions::url = config.drowsyURL + "/contributions"
        CK.Model.DrowsyModel.createNecessaryCollections([
            'contributions'
        ])

# TODO: move this out to sail.js
class CK.Model.DrowsyModel extends Backbone.Model
    idAttribute: "_id"

    parse: (data) ->
        data._id = data._id.$oid
        return data

    initialize: ->
        unless @get(@idAttribute)
            @set @idAttribute, CK.Model.DrowsyModel.generateMongoObjectId()

        unless @get('timestamp')
            @set 'timestamp', Date()

    @generateMongoObjectId: ->
        base = 16 # hex
        randLength = 13
        time = Date.now().toString(base)
        rand = Math.ceil(Math.random() * (Math.pow(base, randLength)-1)).toString(base)
        return time + (Array(randLength+1).join("0") + rand).slice(-randLength)

    @createNecessaryDatabase: (requiredDatabase, afterwards) ->
        config = CK.Model.config
        jQuery.ajax config.mongo.url,
            type: 'get'
            dataType: 'json'
            success: (existingDatabases) ->
                if requiredDatabase in existingDatabases
                    afterwards()
                else
                    jQuery.post(config.mongo.url, {db: requiredDatabase}, afterwards)
            error: (err) ->
                console.error  "Couldn't fetch list of databases because: ", 
                    JSON.parse err.responseText
                throw err.responseText

    @createNecessaryCollections: (requiredCollections) ->
        config = CK.Model.config
        jQuery.ajax config.drowsyURL,
            type: 'get',
            dataType: 'json',
            success: (existingCollections) =>
                for col in requiredCollections
                    unless col in existingCollections
                        console.log "Creating collection '#{col}' under #{config.drowsyURL}";
                        jQuery.post config.drowsyURL,
                            collection: col
            error: (err) =>
                console.error "Couldn't fetch list of collections from #{config.drowsyURL} because: ", JSON.parse(err.responseText)
                throw err.responseText

# TODO: move this out to sail.js
class CK.Model.DrowsyCollection extends Backbone.Collection
    model: CK.Model.DrowsyModel


class CK.Model.Contribution extends CK.Model.DrowsyModel
    urlRoot: undefined # set in CK.Model.setup()

class CK.Model.Contributions extends CK.Model.DrowsyCollection
    model: CK.Model.Contribution
    url: undefined  # set in CK.Model.setup()
    
