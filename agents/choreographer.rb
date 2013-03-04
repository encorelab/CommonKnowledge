require 'rubygems'
require 'blather/client/dsl'
require 'mongo'
require 'rest_client'

$: << 'sail.rb/lib'
require 'sail/agent'
require 'sail/rollcall/user'
require 'sail/rollcall/group'

class Choreographer < Sail::Agent

  def initialize(*args)
    super(*args)
    # @user_wall_assignments = {}
    # @user_wall_assignments_eq = {}
    # @vidwalls_user_tag_counts = {'A' => {}, 'B' => {}, 'C' => {}, 'D' => {}}

    # @students = {}
    # @bucket = []
    # @na_bucket = []
    @buckets_created = false
    @buckets = {}
    @tag_groups = {}
  end

  def behaviour
    when_ready do
      # Setup MongoDB connection
      @mongo = Mongo::Connection.new.db(config[:database])

      #phase = @mongo.collection(:states).find("type" => "phase").first
      @phase = get_phase()
      unless @phase
        store_phase("brainstorm")
      end
      
      join_room
      #join_log_room
      # while @mongo == nil do
      #   log "mongo not ready"
      # end

      get_agent_data().map do |data_set_name, data_set|
        unless data_set_name == "_id"
          if data_set_name == "buckets"
            @buckets = data_set
          elsif data_set_name == "tag_groups"
            @tag_groups = data_set
          elsif data_set_name == "buckets_created"
            @buckets_created = data_set
          else
            log "Not sure what to do with #{data_set_name.inspect}"
          end
        end
      end
    end
    
    self_joined_log_room do |stanza|
      groupchat_logger_ready!
    end

    # This function monitors the chat room and registers any user that joins
    # the goal is to only care for students
    someone_joined_room do |stanza|
      log "Stanza from #{stanza.from.inspect} received"
      # stu = lookup_student(Util.extract_login(stanza.from)) unless stanza.from == agent_jid_in_room
      # if stu
      #   log "#{stu.inspect} joined "
      # end
    end

    # someone_left_room do |stanza|
    #   log "Stanza from #{stanza.from.inspect} received"
    #   log "Student hash before removing #{@students.inspect}"
    #   student_to_remove = @students.delete(Util.extract_login(stanza.from))
    #   log "Student hash after removing #{@students.inspect}"
    # end
    
    event :start_analysis? do |stanza, data|
      log "Received start_analysis #{data.inspect}"

      # this is done to help restore state for UI and others
      store_phase("analysis")
    end

    event :chosen_tag_group? do |stanza, data|
      @phase = get_phase()
      phase_name = @phase['state']
      log "#{@phase.inspect} and #{phase_name.inspect}"
      if phase_name and phase_name == 'analysis' then
        log "Recieved chosen_tag_group #{data.inspect}"
        tag_group_missing = true
        
        #select states with type:tablet and state:analysis from DB and once all have a tag_group set fill go on
        unless @mongo.collection(:user_states).find().any? {|s| (!s[phase_name]['tag_group'] || s[phase_name]['tag_group'] == nil) && s['username'] != data['origin'] } then
          log "All tag groups are set and we go :)"
          unless @buckets_created then
            @buckets_created = create_tagging_buckets(phase_name)

            if @buckets and @buckets != nil and @tag_groups and @tag_groups != nil then
              log "Buckets are filled lets send out first wave of assignments"
              hand_out_initial_assignments()
            end
          else
            log "Trigger happy?"
          end
        else
          log "Not ready for tagging yet"
        end
      end
    end

    event :contribution_tagged? do |stanza, data|
      log "Recieved contribution_tagged #{data.inspect}" 
      username = data['origin']
      hand_out_assignment(username)
      # log "Found #{@bucket.count} contributions with no tags and #{@na_bucket.count} contributions with N/A tags to hand out"
      # # goes through buckets of contributions to tag and sends out contribution_to_tag or done_tagging
      # hand_out_assignment(data['origin'])  
    end

    event :start_proposal? do |stanza, data|
      log "Recieved start_proposal #{data.inspect}"
      # store_phase("proposal")
    end

    event :start_interpretation? do |stanza, data|
      log "Recieved start_interpretation #{data.inspect}"
      store_phase("interpretation")
    end

  end

  # function to check if user joining chat-room is a student in Rollcall
  # def lookup_student(username)
  #   # Check if student is already in the @student hash to avoid extra lookups
  #   stu = @students[username]
    
  #   # do lookup if student is not in hash already
  #   if stu.nil?
  #     log "Looking up user #{username.inspect} in Rollcall..."
      
  #     begin
  #       stu = Rollcall::User.find(username)
  #     rescue ActiveResource::ResourceNotFound
  #       log "#{username.inspect} not found in Rollcall users, trying in groups..."
  #       begin
  #         stu = Rollcall::Group.find(username)
  #       rescue ActiveResource::ResourceNotFound
  #         log "#{username.inspect} not found in Rollcall groups, so we are done..."
  #         return nil
  #       end
  #     end

  #     unless (stu.kind == "Student" || (stu.is_a?(Rollcall::Group) && stu.members.all?{|s| s.kind == "Student"})) then
  #     # unless (stu.kind == "Student" || stu.kind.nil?) then
  #       log "#{username.inspect} is not a student; will be ignored."
  #       return nil
  #     end
      
  #     log "#{username.inspect} is a student and will be considered by agents"
      
  #     # store student in hash to have faster lookup
  #     @students[username] = stu
  #   end
    
  #   return stu
  # end

  def create_tagging_buckets(phase_name)
    log "Function create_tagging_buckets called with phase_name: #{phase_name}"
    @buckets = {}
    @tag_groups = {}
    contributions = []

    # retrieve all published observations
    @mongo.collection(:contributions).find("published" => true).each do |c|
      #contrib = {"contib_id" => c['_id'].to_s, "assigned_user" => nil, "tagged" => false}
      contrib = c['_id'].to_s
      contributions.push(contrib)
    end
    log "All published contributions that are considered for tagging: #{contributions.inspect}"

    # retrieve all users and tag_groups
    
    #@mongo.collection(:states).find("type" => "tablet", "state" => "analysis").each do |s|
    @mongo.collection(:user_states).find(phase_name => { "$exists" => true}).each do |s|
      # (!us['data'] || !us['data']['tag_group'] || us['data']['tag_group'] == nil) then
      if s[phase_name]['tag_group'] and s[phase_name]['tag_group'] != nil and s['username'] then
        # check if object @tag_groups has a key tag_group and a value if not create an empty array
        if !@tag_groups[s[phase_name]['tag_group']] || @tag_groups[s[phase_name]['tag_group']] == nil
          @tag_groups[s[phase_name]['tag_group']] = []
        end

        @tag_groups[s[phase_name]['tag_group']].push(s['username'])
      end
    end
    #log "All tag_groups with users #{@tag_groups}"
    @tag_groups.map do |tag_group, usernames|
      usernames.uniq!
      @buckets[tag_group] = contributions.clone
    end
    #save tag_groups and buckets to database
    set_agent_data("buckets", @buckets)
    set_agent_data("tag_groups", @tag_groups)
    log "All tag_groups with users #{@tag_groups}"
    log "All buckets #{@buckets}"

    set_agent_data("buckets_created", true)
    return true
  end

  # def fill_contribution_buckets()
  #   #empty bucket
  #   @bucket = []
  #   @na_bucket = []
    
  #   # retrieve all contributions that make up the bucket of contribs to be tagged
  #   # @mongo.collection(:contributions).find("tags" => { "$exists" => true}, "author" => { "$exists" => true }, "headline" => { "$exists" => true }, "content" => { "$exists" => true }).each do |contrib|
  #   @mongo.collection(:contributions).find("tags" => { "$exists" => true}).each do |contrib|
  #     contributionId = contrib['_id'].to_s

  #     if (!contrib['tags'].empty? && contrib['tags'].any?{|t| t['name'] == "N/A"})
  #       log "#{contrib.inspect}"
  #     end

  #     # only work on contributions that are not tagged yet or that have n/a tag
  #     if contrib['tags'].empty?
  #       @bucket.push(contributionId)
  #     elsif (!contrib['tags'].empty? && contrib['tags'].any?{|t| t['name'] == "N/A"})
  #       na_tag = contrib['tags'].select{|v| v['name'] == "N/A"}
  #       log "na_tag content #{na_tag}"
  #       @na_bucket.push({"contribution_id" => contributionId, "tagger" => na_tag.first['tagger']})
  #     end
  #   end

  #   log "bucket #{@bucket.count} / na bucket #{@na_bucket.count}"
  # end

  def hand_out_initial_assignments()
    log "Function hand_out_initial_assignments"
    # go over the tag groups and assign each user to a contribution for tagging
    @tag_groups.map do |group, users|
      log "Handing out for tag_group: #{group.inspect}"
      bucket = @buckets[group]
      log "from bucket: #{bucket.inspect}"
      # iterate over all users of a tag_group and assign them with a contribution to tag
      users.each do |user|
        # Are there contributions left for assignment
        #if bucket.any?{|c| c['assigned_user'] == nil} then
        unless bucket.empty? then
          # contribution = bucket.select!{|c| c['assigned_user'] == nil}.first
          # send_tag_assignment(user, contribution['contib_id'])
          # contribution['assigned_user'] = user
          send_tag_assignment(user, bucket.pop())
#TODO update data for user?
        else
          log "No contribution in tag_group #{group.inspect} left for user #{user.inspect}"
          send_done_tagging(user)
        end
      end
      log "bucket for #{group.inspect}: #{@buckets[group].inspect}"
      set_agent_data("buckets", @buckets)
    end
  end

  # important: Run fill_contribution_buckets first
  def hand_out_assignment(username)
    log "Function hand_out_assignment for #{username.inspect}"
    # go over the tag groups and assign each user to a contribution for tagging
    @tag_groups.map do |group, users|
      # iterate over all users of a tag_group and assign them with a contribution to tag
      users.each do |user|
        # only do if user in users matches username
        if user == username then
          log "Handing out for user: #{username.inspect}"
          bucket = @buckets[group]
          log "from bucket: #{bucket.inspect}"
          # Are there contributions left for assignment
          unless bucket.empty? then
            send_tag_assignment(user, bucket.pop())
          else
            log "No contribution in tag_group #{group.inspect} left for user #{user.inspect}"
            send_done_tagging(user)
          end
        end
      end
      log "bucket for #{group.inspect}: #{@buckets[group].inspect}"
      set_agent_data("buckets", @buckets)
    end
  end

  def send_tag_assignment(user, contributionId)
    # user_state = @mongo.collection(:user_states).find(:username => user).first
    # if user_state then
    #   # log "user_state #{user_state.inspect}"
    #   data = user_state['analysis'] 
    #   # log "data #{data.inspect}"
    #   data['contribution_to_tag'] = {:contribution_id => contributionId}
    #   @mongo.collection(:user_states).save(user_state)
    #   log "Saved contribution_to_tag #{user_state.inspect}"
    # end
    store_user_state (user, 'analysis', 'contribution_to_tag'], {:contribution_id => contributionId})
    # find a problem with assigned 'false'
    # user_to_contribution_id_assignments.map do |user, contributionId|
      log "Sending tag_assignment for user '#{user.inspect}' for contributionId '#{contributionId.inspect}'"
      event!(:contribution_to_tag, {:recipient => user, :contribution_id => contributionId})
    # end
  end

  def send_done_tagging(user)
    # user_state = @mongo.collection(:user_states).find(:username => user).first
    # if user_state then
    #   # log "user_state #{user_state.inspect}"
    #   data = user_state['analysis'] 
    #   # log "data #{data.inspect}"
    #   data['done_tagging'] = true
    #   @mongo.collection(:user_states).save(user_state)
    #   log "Saved done_tagging #{user_state.inspect}"
    # end
    store_user_state (user, 'analysis', 'done_tagging'], true)
    log "Sending done_tagging for user '#{user.inspect}'"
    event!(:done_tagging, {:recipient => user})    
  end

  def get_phase()
    return @mongo.collection(:states).find("type" => "phase").first
  end

  def store_phase(phaseName)
    done = false

    phase = @mongo.collection(:states).find("type" => "phase").each do |state|
      state['state'] = phaseName
      state['modified_at'] = Time.now.utc
      log "Saving state #{state.inspect}"
      @mongo.collection(:states).save(state)
      done = true
      break
    end

    unless done
      log "Inserting new state with state #{phaseName.inspect}"
      @mongo.collection(:states).save("type" => "phase", "state" => phaseName, "created_at" => Time.now.utc)
    end 
  end

  def store_user_state (username, phase, store_where, store_what)
    user_state = @mongo.collection(:user_states).find(:username => username).first
    if user_state then
      # log "user_state #{user_state.inspect}"
      data = user_state[phase] 
      # log "data #{data.inspect}"
      data[store_where] = store_what
      @mongo.collection(:user_states).save(user_state)
      log "Saved #{store_where.inspect} #{user_state.inspect}"
    end
  end

  def get_agent_data()
    agent_data = @mongo.collection(:agent_data).find().first
    
    unless agent_data then
      agent_data = {}
      @mongo.collection(:agent_data).save(agent_data)
    end

    return agent_data
  end

  def set_agent_data(key, data_to_store)
    agent_data = get_agent_data()
    agent_data[key] = data_to_store
    @mongo.collection(:agent_data).save(agent_data)
  end


  def shift_left (array, howOften = 1)
    unless array == nil || !array.kind_of?(Array) || array.empty? then
      if howOften > 0 then
        first_element = array.shift
        array.push(first_element)
        return shift_left(array, (howOften - 1))
      else
        return array
      end
    end
    return array
  end
  
end
