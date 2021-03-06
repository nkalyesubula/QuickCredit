import User from '../models/user_model';
import jwt from 'jsonwebtoken'; // used to create, sign, and verify tokens
import bcrypt from 'bcryptjs';
import validater from '../helper';
import pool from '../../services/connectdb';
import dotenv from 'dotenv';

dotenv.config();

class UserController {
////////////////////////////////////////////////////// Register user ////////////////////////////////////////////////////////////////////////////////////
      static registerUser(req, res) {
        const result = validater.registerUserValidation(req.body);
        if(result.error) return res.status(400).send({"status":400, "error":result.error.details[0].message});
        
        // check if user already exists
        const query = 'SELECT * FROM users WHERE email =$1';
        const value=[req.body.email];
        pool.query(query, value, (error, result) => {
          if(result.rows.length > 0) {
            return res.status(400).send({ "status":400, "error":"User already exists"});
          } else {
            
            const hashedPassword = bcrypt.hashSync(req.body.password, 8);
        
            const user = new User(req.body.email, req.body.firstName, req.body.lastName, hashedPassword, req.body.address, req.body.isAdmin);
        
            const query = 'INSERT INTO users(firstName,lastName, address, email, password, isAdmin) VALUES($1,$2,$3,$4,$5,$6) RETURNING *';
            const values = [user.firstName, user.lastName, user.address,user.email, user.password, user.isAdmin];
    
            pool.query(query, values, (error, result) => {
                if (error) {
                    return res.status(400).json({status:400, error:error});
                }
                // create a token
                const token = jwt.sign({ id: result.rows[0]['id'] }, process.env.SECRET_KEY , {
                    expiresIn: 86400 // expires in 24 hours
                });
                return res.status(201).json({
                    status: 201,
                    data:{
                        token:token,
                        id: result.rows[0]['id'],
                        email: result.rows[0]['email'],
                        firstName: result.rows[0]['firstname'],
                        lastName: result.rows[0]['lastname'],
                        address: result.rows[0]['address'],
                        status: result.rows[0]['status'],
                        isAdmin: result.rows[0]['isadmin']
                    }
                });
            });
        }
        });
}

 /////////////////////////////////////////////////////////// Login User //////////////////////////////////////////////////////////////////////
 static LoginUser(req, res) {
    const result = validater.loginUserValidation(req.body);
    if(result.error){
       return res.status(400).send({"status":400, "error":result.error.details[0].message});
    }
    
    //check if the email already exists
    const query = 'SELECT * FROM users WHERE email =$1';
    const value=[req.body.email];
    pool.query(query, value, (error, result) => {
        if(result.rows.length > 0){
        const passwordIsValid = bcrypt.compareSync(req.body.password, result.rows[0]['password']);
        if(!passwordIsValid) return res.status(401).send({ 'error': 'Wrong password', 'status':401 });
            // create a token
            const token = jwt.sign({ id: result.rows[0]['id'] }, process.env.SECRET_KEY , {
            expiresIn: 86400 // expires in 24 hours
        });
        return res.status(200).json({
            status: 200,
            data:{
                token:token,
                id: result.rows[0]['id'],
                email: result.rows[0]['email'],
                firstName: result.rows[0]['firstname'],
                lastName: result.rows[0]['lastname'],
                address: result.rows[0]['address'],
                status: result.rows[0]['status'],
                isAdmin: result.rows[0]['isadmin']
            }
        });
      }
      return res.status(404).send({'error':'The user with the given email was not found.', 'status':404});
    });   
}

////////////////////////////////////////////////// Mark User as Verified ////////////////////////////////////////////////////////////////////
  static VerifyUser(req, res) {  
    const token = req.headers['x-access-token'];
    if (!token) return res.status(401).send({ 'error': 'No token provided', 'status': 401 });
    
    jwt.verify(token, process.env.SECRET_KEY, function(err, decoded) {
    if (err) return res.status(401).send({ status: 401, error: 'Failed to authenticate token.' });
    
    //check if user is an admin
    const query = 'SELECT * FROM users WHERE id =$1';
    const value=[decoded.id];
    pool.query(query, value, (error, result) => {
        if(result.rows[0]['isadmin'] != true)  return res.status(401).send({status:401, error: 'You dont have administrative privileges to execute this route.'});
        
        //check if the provided email is a valid email
        const results = validater.verifyUserValidation(req.params);
        if(results.error) return res.status(400).send({"status":400, "error":results.error.details[0].message});

        const getverifieduser = 'SELECT * FROM users WHERE email =$1';
        const query_value =[req.params.userEmail];
        const verify_user_query = 'UPDATE users set status=$1 WHERE email =$2';
        const required_values =['verified', req.params.userEmail];
        pool.query(getverifieduser, query_value, (error, result) => {
            if(result.rows.length == 0) return res.status(404).send({status:404, error:'User with provided email is not found'});
            pool.query(verify_user_query, required_values, (error, result) => {
            
                // Return the verified user
                pool.query(getverifieduser, query_value, (error, result) => {
                    return res.status(200).json({
                        status: 200,
                        data:result.rows
                    });
                });  
            });
        });
    });
});
}

/////////////////////////////////////////////// Reset Password /////////////////////////////////////////////////////////////////////////////
static resetPassword(req, res) {
    const result = validater.resetPasswordValidation(req.body);
    if(result.error){
       return res.status(400).send({"status":400, "error":result.error.details[0].message});
    }
    
    //check if the email already exists
    const query = 'SELECT * FROM users WHERE email =$1';
    const value=[req.body.email];
    pool.query(query, value, (error, result) => {
        if(result.rows.length > 0){
        const passwordIsValid = bcrypt.compareSync(req.body.currentPassword, result.rows[0]['password']);
        if(!passwordIsValid) return res.status(401).send({ 'error': 'Wrong current password provided', 'status':401 });
        //encrypt new password
        const hashedPassword = bcrypt.hashSync(req.body.newPassword, 8);
        //persist new pahashedPasswordssword in the users table
        const resetPasswordQuery = 'UPDATE users set password=$1 WHERE email =$2';
        const newPasswordArgs=[hashedPassword,req.body.email];
        pool.query(resetPasswordQuery, newPasswordArgs, (error, result) => {
            return res.status(200).json({
                status: 200,
                message:'Your password has been successfully reset'
            }); 
        });
      }else{
      return res.status(404).send({'error':'The user with the given email was not found.', 'status':404});}
    });   
}


}






export default {UserController};