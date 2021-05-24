/*

 local (poate fi apelat numai din alt smart contract si nu din APIHub)
 read (fara semnatura si consens, nu se inregistreaza)
 write (consens)
 describeMethods(){
   read:[m1,m2]
   write:["m3"]   
 }

 BDNS Smart Contract
  addSubdomain(controllerDID, signature, callback)
  getSubdomainInfo(callback)
  updateSubdomainInfo(signature, JSON, callback)
  deleteSubdomain(signature)

ApiHub Endpoints
/generateWriteCommand ({contract, method,args:[args...],nounce, signature})  //generateReadCommand(Consensus, getNounce, signedDID) 
/generateReadCommand({contract, method,args:[args...]})

Consensus Smart Contract
  getNonce(SignerDID)
  sendCommandToConsensus(command, callback)
  ..
  
  
*/


