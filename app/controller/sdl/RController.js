/*
 * Copyright (c) 2013, Ford Motor Company All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met: ·
 * Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer. · Redistributions in binary
 * form must reproduce the above copyright notice, this list of conditions and
 * the following disclaimer in the documentation and/or other materials provided
 * with the distribution. · Neither the name of the Ford Motor Company nor the
 * names of its contributors may be used to endorse or promote products derived
 * from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @name SDL.RController
 * @desc SDL abstract application controller
 * @category Controller
 * @filesource app/controller/sdl/RController.js
 * @version 1.0
 */

SDL.RController = SDL.ABSController.extend({

    /**
     * Button action to sent response for RC.GrantAccess request
     *
     * @type {Object}
     */
    ControlAccessAction: function (appID, value) {
            if (value) {
                FFW.RC.sendRCResult(
                    SDL.SDLModel.data.resultCode['SUCCESS'],
                    SDL.SDLModel.controlRequestID,
                    "RC.GrantAccess"
                );
                SDL.SDLModel.set('givenControl', appID);
                SDL.SDLModel.set('givenControlFlag', true);
                //FFW.CAN.OnRadioDetails({"radioStation": SDL.RadioModel.radioDetails.radioStation});

                FFW.RC.onInteriorVehicleDataNotification("RADIO", null, SDL.RadioModel.get('radioControlData'));
            } else {
                FFW.RC.sendError(
                    SDL.SDLModel.data.resultCode['REJECTED'],
                    SDL.SDLModel.controlRequestID,
                    "RC.GrantAccess",
                    "Request cancelled."
                );
            }
            SDL.SDLModel.set('controlRequestID', null);
    },

    /**
     * Send notification to SDL about changes of SDL functionality
     * @param element
     * @constructor
     */
    OnReverseAppsAllowing: function (element) {
        element.toggleProperty('allowed');

        if (!element.allowed) {
            SDL.RadioModel.consentedApp = null;
            SDL.ClimateController.model.consentedApp = null;
        }

        FFW.RC.OnReverseAppsAllowing(element.allowed);
    },

    /**
     * Change responses to error for GetInteriorVehicleDataCapabilities
     * @param element
     * @constructor
     */
    setRCCapabilitiesErrorResponse: function (element) {
        SDL.SDLModel.toggleProperty('errorResponse');
    },


    /**
     * Register application method
     *
     * @param {Object}
     *            params
     * @param {Number}
     *            applicationType
     */
    registerApplication: function(params, applicationType) {

        if (applicationType === undefined || applicationType === null) {

            SDL.SDLModel.data.get('registeredApps').pushObject(this.applicationModels[0].create( { //Magic number 0 - Default media model for not initialized applications
                appID: params.appID,
                appName: params.appName,
                deviceName: params.deviceName,
                appType: params.appType,
                isMedia: 0,
                disabledToActivate: params.disabled ? true : false
            }));
        } else if (applicationType === 2) {//Magic number 2 - Default RC application with non-media model

            SDL.SDLModel.data.get('registeredApps').pushObject(this.applicationModels[1].create( {//Magic number 1 - Default non-media model
                appID: params.appID,
                appName: params.appName,
                deviceName: params.deviceName,
                appType: params.appType,
                isMedia: false,
                initialized: true,
                disabledToActivate: params.disabled ? true : false
            }));
        } else {

            SDL.SDLModel.data.get('registeredApps').pushObject(this.applicationModels[applicationType].create( {
                appID: params.appID,
                appName: params.appName,
                deviceName: params.deviceName,
                appType: params.appType,
                isMedia: applicationType == 0 ? true : false,
                initialized: true,
                disabledToActivate: params.disabled ? true : false
            }));
        }

        var exitCommand = {
            "id": -10,
            "params": {
                "menuParams":{
                    "parentID": 0,
                    "menuName": "Exit 'DRIVER_DISTRACTION_VIOLATION'",
                    "position": 0
                },
                cmdID: -1
            }
        };

        SDL.SDLController.getApplicationModel(params.appID).addCommand(exitCommand);

        exitCommand = {
            "id": -10,
            "params": {
                "menuParams":{
                    "parentID": 0,
                    "menuName": "Exit 'USER_EXIT'",
                    "position": 0
                },
                cmdID: -2
            }
        };

        SDL.SDLController.getApplicationModel(params.appID).addCommand(exitCommand);

        exitCommand = {
            "id": -10,
            "params": {
                "menuParams":{
                    "parentID": 0,
                    "menuName": "Exit 'UNAUTHORIZED_TRANSPORT_REGISTRATION'",
                    "position": 0
                },
                cmdID: -3
            }
        };

        SDL.SDLController.getApplicationModel(params.appID).addCommand(exitCommand);
    },

    toggleDriverDeviceWindow: function(element) {
        SDL.PrimaryDevice.toggleProperty('active');
    },

    driverDeviceWindowClose: function(device, rank) {

        this.toggleDriverDeviceWindow();

        if (!device) {
            return;
        }

        if (rank === 1 && SDL.SDLModel.driverDeviceInfo) { //Magic number 1 means passenger's device
            var apps = SDL.SDLModel.data.registeredApps;

            for (var i = 0; i < apps.length; i++) {
                if (apps[i].deviceName === device.name
                    && device.name === SDL.SDLModel.driverDeviceInfo.name) {

                    apps[i].level = 'NONE';
                    SDL.SDLModel.set('driverDeviceInfo', null);
                }
            }

            SDL.InfoAppsView.showAppList();
            FFW.RC.OnDeviceRankChanged(device, SDL.SDLModel.deviceRank[rank]);
        } else if (rank === 0) {  //Magic number 1 means driver's device

            SDL.SDLModel.set('driverDeviceInfo', device);
            SDL.InfoAppsView.showAppList();
            FFW.RC.OnDeviceRankChanged(device, SDL.SDLModel.deviceRank[rank]);
        }
    },

    /**
     * Handeler for OnKeyboardInputcommand button press
     *
     * @param element
     *            SDL.Button
     */
    onCommand: function (element) {

        if (element.commandID < 0) {

            switch (element.commandID) {
                case -1: {
                    FFW.BasicCommunication.ExitApplication(SDL.SDLController.model.appID, "DRIVER_DISTRACTION_VIOLATION");
                    break;
                }
                case -2: {
                    FFW.BasicCommunication.ExitApplication(SDL.SDLController.model.appID, "USER_EXIT");
                    SDL.RadioModel.consentedApp = null;
                    SDL.ClimateController.model.consentedApp = null;

                    SDL.SDLModel.set('givenControlFlag', false);
                    break;
                }
                case -3: {
                    FFW.BasicCommunication.ExitApplication(SDL.SDLController.model.appID, "UNAUTHORIZED_TRANSPORT_REGISTRATION");
                    break;
                }
                default: {
                    console.log("Unknown command with ID: " + element.commandID);
                }
            }

            SDL.OptionsView.deactivate();
            SDL.States.goToStates('info.apps');

        } else if (element.menuID >= 0) {

            // if subMenu
            // activate driver destruction if necessary
            if (SDL.SDLModel.data.driverDistractionState) {
                SDL.DriverDistraction.activate();
            } else {
                this.onSubMenu(element.menuID);
            }
        } else {

            FFW.UI.onCommand(element.commandID, this.model.appID);
            SDL.OptionsView.deactivate();
        }
    },

    interiorDataConsent: function(request){

        var appName = SDL.SDLController.getApplicationModel(request.params.appID).appName;
        var req = request;
        var popUp = null;

        if (request.params.moduleType === "RADIO") {
            if (SDL.RadioModel.consentedApp) {
                FFW.RC.sendError(SDL.SDLModel.data.resultCode["REJECTED"], request.id, request.method, "Already consented!")
            } else {
                popUp = SDL.PopUp.create().appendTo('body').popupActivate(
                    "Would you like to grant access for " + appName + " application - moduleType: Radio?",
                    function(result){
                        FFW.RC.GetInteriorVehicleDataConsentResponse(req, result);
                        if (result) {

                            SDL.SDLModel.set('givenControlFlag', true);
                            SDL.RadioModel.consentedApp = request.params.appID;
                        }
                    }
                );
            }
        } else {
            if (SDL.ClimateController.model.consentedApp) {
                FFW.RC.sendError(SDL.SDLModel.data.resultCode["REJECTED"], request.id, request.method, "Already consented!")
            } else {
                popUp = SDL.PopUp.create().appendTo('body').popupActivate(
                    "Would you like to grant access for " + appName + " application - moduleType: Climate?",
                    function(result){
                        FFW.RC.GetInteriorVehicleDataConsentResponse(req, result);
                        if (result) {

                            SDL.SDLModel.set('givenControlFlag', true);
                            SDL.ClimateController.model.consentedApp = request.params.appID;
                        }
                    }
                );
            }
        }

        setTimeout(function(){
            if (popUp && popUp.active) {
                popUp.deactivate();
                FFW.RC.sendError(SDL.SDLModel.data.resultCode['TIMED_OUT'],req.id, req.method, "Timed out!")
            }
        }, 10000); //Magic number is timeout for RC consent popUp
    }
});