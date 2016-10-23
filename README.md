# SiqStory Journalist

 A script that records all dom mutations and most events, and sends them down as SiqStories which are composed of SiqStoryTwists to the siqstory-collector, which is a public lambda used for capturing these bad boyz. You could easily change the endpoint it hits inside `sendTwists` if you don't want to use mine (which seems likely). The stories captured there can be replayed FullStory style by the [SiqStory Teller](http://github.com/relateiq/siqstory-teller "SiqStory Teller") 
 
 Currently I was lazy and the script must be required from a bundler like browserify or webpack, but you could easily bundle it as a UMD script to drop into any page. (Feel free to submit a pr!)
