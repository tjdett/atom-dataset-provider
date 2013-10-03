#!/bin/bash
bash ./kill-provider.sh
LOG=atom-dataset-provider.log
STAGING="/mnt/np_staging"
USERNAME='[^/]+'
INSTRUMENT='[^/]+'
EXPERIMENT='[^/]+'
DATASET='[^/]+'

# Modify the above regex components to suit your installation. For example, if usernames are like e1234 or s2345:
# USERNAME="[EeSs][0-9]+"
# You will also need to modify the templates to suit.
# In this structure, if users put files directly in the experiment level, they'll be grouped together in a dataset sharing that name.
GROUPPATTERN="^(${STAGING}/${USERNAME}/${INSTRUMENT}/${EXPERIMENT}/(${DATASET}/)?).*"

# Two rules for the --group-pattern argument:
# 1. The regex must match the entire filepath of each file, or it won't be included anywhere.
# 2. All files that share the first group in the regex (in parentheses) form a group, and hence, one dataset.

# The --file-list argument should point to a file that contains one file per line, and should be used in conjunction with
# --group-pattern and --directory.

FILECHANGES=''
#FILECHANGES="--file-list minichanges.log"

nohup `pwd`/bin/atom-dataset-provider -d "$STAGING"  --group-pattern "$GROUPPATTERN"  --no-hashes $FILECHANGES >> $LOG &
echo "Running provider in background, logging to ${LOG}."
