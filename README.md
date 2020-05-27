
## Description


It is a simple cli syncronizer of JSON locale files.
So, you can create a schema for a single language, 
and that schema will be copied over to other requested languages, so 
you would only need to fill the blanks.

It would be also useful if schema changes to re-sync your json files


This tool was inspired by i18nex-json-sync. For my project I really
needed a tool that would be able to handle namespaces, so I quickly made this one.

!NOTICE:
Current version does not support plurals yet

## Usage

node sync.js -p path/to/locales/in/glob -m <master_language_code> [OPTIONS]

### OPTIONS:

-p 
    Path to locale directory in glob format 
    with mandatory {{lang}} and optional {{ns}}  placeholders.
    
    Ex.: **/public/locales/{{lang}}/{{ns}}.json
    Or
    **/public/locales/{{lang}}.json
    
    Notice, {{lang}} occupies entire name of a file without extension, or directory, 
    so you cannot have suffixes or prefixes with {{lang}}, for example
    this would be invalid: /locales/loc_{{lang}}/
    
    Same applies to {{ns}}
    If you supply {{ns}}, then {{lang}} must be before it in the path
    There can be multiple -p parameters. All will be processed sequentially .
    
-m 
    Master language that will be used as a template for other resources
    
-l 
    comma separated language codes that must have reources exist. If resources
    are not found - they will be created.
    
    Ex.: -l en,cn,fr,de
    
-c 
    This option will copy the value from master language if property does not exist in
    slave language.
    
-e
    This option will put an empty string if property does not exist OR matches
    value in master language.


