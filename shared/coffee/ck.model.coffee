class CK.Model
    @configure: (config) ->
        unless config.run? and app.run.name?
            throw "Cannot configure model because config does not have a run.name!"

        config.drowsyURL = config.mongo.url + "/" + config.run.name

        CK.Model::Contribution.urlRoot = config.drowsyURL + "/contributions"
        CK.Model::Contributions.url = config.drowsyURL + "/contributions"
        @createNecessaryCollections([
            'contributions'
        ])

# TODO: move this out to sail.js
class CK.Model::DrowsyModel extends Backbone.Model
    idAttribute: "_id"

    parse: (data) ->
        data._id = data._id.$oid
        return data

    initialize: ->
        unless @get(@idAttribute)
            @set @idAttribute, model.generateMongoObjectId()

        unless @get('timestamp')
            @set 'timestamp', Date()

    @generateMongoObjectId: ->
        base = 16 # hex
        randLength = 13
        time = (new Date()).getTime().toString(base)
        rand = Math.ceil(Math.random() * (Math.pow(base, randLength)-1)).toString(base)
        return time + (Array(randLength+1).join("0") + rand).slice(-randLength)

    @createNecessaryDatabase: (requiredDatabase, afterwards) ->
        jQuery.ajax app.config.mongo.url,
            type: 'get'
            dataType: 'json'
            success: (existingDatabases) ->
                if requiredDatabase in existingDatabases
                    afterwards()
                else
                    jQuery.post(app.config.mongo.url, {db: requiredDatabase}, afterwards)
            error: (err) ->
                console.error  "Couldn't fetch list of databases because: ", 
                    JSON.parse err.responseText
                throw err.responseText

    @createNecessaryCollections: (requiredCollections) ->
        jQuery.ajax app.drowsyURL,
            type: 'get',
            dataType: 'json',
            success: (existingCollections) ->
                for col in requiredCollections
                    unless col in existingCollections
                        console.log "Creating collection '#{col}' under #{app.drowsyURL}";
                        jQuery.post app.drowsyURL,
                            collection: col
            error: (err) ->
                console.error "Couldn't fetch list of collections from #{app.drowsyURL} because: ", JSON.parse(err.responseText)
                throw err.responseText

# TODO: move this out to sail.js
class CK.Model::DrowsyCollection extends Backbone.Model
    model: CK.Model::DrowsyModel


class CK.Model::Contribution extends CK.Model::DrowsyModel
    urlRoot: undefined # set in CK.Model.setup()

class CK.Model::Contribution extends CK.Model::DrowsyModel
    model: CK.Model::Contribution
    url: undefined  # set in CK.Model.setup()
    
