#!/bin/bash
#resetting mapdata.json to master branch version
# INSTALL
#ln -s ./pre-push.sh .git/hooks/pre-push

BRANCH=`git rev-parse --abbrev-ref HEAD`
PUSH_COMMAND=`ps -ocommand= -p $PPID`
PROTECTED_BRANCHES="^(dev|release-*|patch-*)"
FORCE_PUSH="force|delete|-f"

#if [[ "$BRANCH" =~ $PROTECTED_BRANCHES && "$PUSH_COMMAND" =~ $FORCE_PUSH ]]; then
if [[ "$BRANCH" =~ $PROTECTED_BRANCHES]]; then
  git checkout master docs/data/mapdata.json
  git commit -am "updating mapdata from master"
  # echo "Prevented force-push to protected branch \"$BRANCH\" by pre-push hook"
  exit 1
fi

exit 1

