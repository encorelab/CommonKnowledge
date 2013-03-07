$: << File.dirname(__FILE__)+"/sail.rb/lib"
$: << File.dirname(__FILE__)
require 'sail/daemon'

# "agent" users on Rollcall must be given the password "s3agent!"
# which is hashed to AGENT_PASSWORD in XMPP
AGENT_PASSWORD = "9186ebc4790dfba833826e13c42c885f6f847274" # s3agent!

#RUNS = ['ab', 'cd', 'a','b','c','d'].collect{|alph| "neo-#{alph}"}
#RUNS = ['beta1'].collect{|alph| "ck-#{alph}"}
#RUNS = ['beta1-ben'].collect{|alph| "ck-#{alph}"}
RUNS = ['beta1-julia'].collect{|alph| "ck-#{alph}"}
#RUNS = ['alpha2'].collect{|alph| "ck-#{alph}"}

@daemon = Sail::Daemon.spawn(
  :name => "ck",
  :path => '.',
  :verbose => true
)

@daemon.load_config("../config.json")
ENV['ROLLCALL_URL'] = @daemon.config[:rollcall][:url]

require 'event_logger'
#require 'location_tracker'
require 'choreographer'

RUNS.each do |run|
  @daemon << EventLogger.new(:room => run, :password => AGENT_PASSWORD, :database => run)
  @daemon << Choreographer.new(:room => run, :password => AGENT_PASSWORD, :database => run)
end


@daemon.start
