
function commit(){
    git commit $1 $2
    gpr master
    git commit -am "updating map from master for merge"
} 

function gpr(){
    git pull --rebase origin $1
}