export const getBookingTemplate = (
    name: string,
    tournamentName: string,
    hostName: string,
    roomDescription: string,
    checkinDate: string,
    checkinDateFull: string,
    checkoutDateFull: string,
    bookingDate: string
) => `
<!doctype html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml">
 <head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <link  href="https://www.booking.com/confirmationmg.de.html" rel="canonical" />
  <title>🛄 Danke! Ihre Buchung ist bestätigt: ${hostName} (Privatzimmer) </title>
  <link  href="https://r-xx.bstatic.com/static/img/favicon.ico" rel="shortcut icon" />
  <style type="text/css">
.ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div {line-height:100%;}
body {-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
body {-webkit-font-smoothing:antialiased;}
body {margin:0 auto !important;padding:0;}
body {width:100% !important;}
table {border-spacing:0;}
img {border:0 none;line-height:100%;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
a img {border:0 none;text-decoration:none;}
table td {border-collapse:collapse;}
table {border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;}
blockquote .hideforwarded, .WordSection1 .hideforwarded {width:0;max-height:0;overflow:hidden;float:left;display:none;}
blockquote .showforwarded, .WordSection1 .showforwarded {display:block!important;width:auto!important;max-height:inherit!important;overflow:visible!important;float:none!important;}
.ReadMsgBody {width:100%;}
 .ExternalClass {width:100%;}
body {-webkit-font-smoothing:auto;}
strong {font-weight:bold;}
a[x-apple-data-detectors] {
color: inherit !important;
text-decoration: none !important;
font-size: inherit !important;
font-family: inherit !important;
font-weight: inherit !important;
line-height: inherit !important;
}
.preheader {display:none;}
@media only screen and (max-width: 639px) {
.m-hide{
display: none !important;
height: 0 !important;
margin: 0 !important;
max-height: 0 !important;
overflow: hidden !important;
padding: 0 !important;
visibility: hidden !important;
width: 0 !important;
}
.deviceWidth {width:95%!important;padding:0!important;}
.m-fw {width:100%!important;}
.m-stack {display:block!important;width:100%!important;float:left!important;}
.m-centeralign {text-align:center!important;}
.m-leftalign {text-align:left!important;}
.m-vertical-align-top {vertical-align:top!important;}
.m-show {display:block!important;}
.m-no-max-width {max-width:none!important;}
.m-no-height {height:auto!important;}
.logo_mob {width:192px !important; height:32px !important;}
.logo_mob_ar {width:245px !important; height:28px !important;}
.logo_mob_zh {width:240px !important; height:30px !important;}
.remove-borders {
border-top: 0 !important;
border-bottom: 0 !important;
border-left: 0 !important;
border-right: 0 !important;
}
.remove-padding-top {
padding-top: 0 !important;
}
.small-padding-bottom {
padding-bottom: 4px !important;
}
}
@media (max-width: 639px) {
.mobile_cta {
display: block !important;
}
.desktop_cta {
display: none !important;
}
}
@media (min-width: 640px) {
.desktop_cta {
display: block !important;
}
.mobile_cta {
display: none !important;
}
}
@media (max-width: 639px) {
.pre_trip_img {
background-image: url('https://r-xx.bstatic.com/static/img/newsletters/bgo_pretrip_travel_better_mob.png') !important;
background-repeat:no-repeat !important;
background-size: 100% !important;
background-position:left !important;
width: 100% !important;
height: 150px !important;
min-height: 140px !important;
max-height: none !important;
}
.pre_trip_img_mob {
background-image: url('https://r-xx.bstatic.com/static/img/newsletters/bgo_pretrip_travel_better_mob.png') !important;
background-repeat: no-repeat !important;
background-size: 100% !important;
background-position: left !important;
width: 100% !important;
height: 150px !important;
min-height: 140px !important;
max-height: none !important;
display:block;
}
.taxi_mobile_img {
background-image: url('https://r-xx.bstatic.com/static/img/newsletters/emk_ebo_conf_taxi_new_mobile.png' ) !important;
background-repeat:no-repeat !important;
background-size: 100% !important;
background-position:left !important;
width: 100% !important;
height: 150px !important;
min-height: 140px !important;
max-height: none !important;
display: block !important;
}
*[class~=responsive_table] {
width: 100%!important;
}
*[class~=hide_on_mobile] {
display: none !important;
max-height:0;
}
.m-text-center {
text-align: center !important;
}
.m-table-center {
margin: 0 auto !important;
}
}
@media only screen and (max-width: 639px) {
.mobile-only {
display: block !important;
max-height: none !important;
overflow: visible !important;
visibility: visible !important;
}
.mobile-hide {
display: none !important;
height: 0 !important;
margin: 0 !important;
max-height: 0 !important;
overflow: hidden !important;
padding: 0 !important;
visibility: hidden !important;
width: 0 !important;
}
u + .body .full-wrap {
width:100vw !important;
}
div > u + .body .full-wrap {
width:100% !important;
}
.m-show-gta-image {
padding-top: 230px !important;
background-image: url('https://r-xx.bstatic.com/static/img/guest_mf_confirmation_apps/confirmation_gta_banner_image.png');
background-position: center 8px;
background-size: 222px;
background-repeat: no-repeat;
}
}
.border-collapse-child-tables table {
border-collapse: separate;
}
</style>
  <title data-react-helmet="true">
  </title>
  <style type="text/css">
<!--

-->
</style>

  <style type="text/css">
<!--

-->
</style>

  <style type="text/css">
<!--

-->
</style>

  <style type="text/css">
<!--

-->
</style>

  <style type="text/css">
<!--

-->
</style>

  <style type="text/css">
<!--

-->
</style>

  <style type="text/css">
<!--

-->
</style>

  <style type="text/css">
<!--

-->
</style>

  <style type="text/css">
<!--

-->
</style>

  <style type="text/css">
<!--

-->
</style>

  <style type="text/css">
<!--

-->
</style>

  <style type="text/css">
<!--

-->
</style>

  <style type="text/css">
<!--

-->
</style>

  <style type="text/css">
<!--

-->
</style>

  <style type="text/css">
<!--

-->
</style>

  <style type="text/css">
<!--

-->
</style>

  <style type="text/css">
<!--

-->
</style>

  <style data-rh="true">
            .b4b-email-banner-container {
              max-width: 624px;
              margin: 0 auto;
              box-sizing: border-box;
            }
        
            .b4b-email-banner-container-block {
              box-sizing: border-box;

            }
        
            .b4b-email-banner-container-block-a {
              width: 410px;
              float: left;
              margin-right: 8px;
            }
        
            .b4b-email-banner-container-block-b {
              overflow: hidden; /* Clear float */
            }
        
            @media (max-width: 624px) {
              .b4b-email-banner-container-block-a, .b4b-email-banner-container-block-b {
                width: 100%;
                float: none;
                margin-right: 0px;
                margin-bottom: 8px;
              }
            }
          </style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-1-R3dn9msjdu5.bui-mobile-1-R3dn9msjdu5{display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-2-R5dn9msjdu5.bui-mobile-2-R5dn9msjdu5{display: none !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-3-Rdmsjdu5.bui-mobile-3-Rdmsjdu5{display: none !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-4-Rsrdu5.bui-mobile-4-Rsrdu5{display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-5-Rt3du5.bui-mobile-5-Rt3du5{display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-1-Re6{width: 100% !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-4-R15n5uc{text-align: center !important;width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-5-R19n5uc{padding-top: 16px !important;text-align: center !important;width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-1-R15uc{width: 100% !important;display: block !important;}.bui-mobile-2-R15uc{width: 100% !important;display: block !important;}.bui-mobile-3-R15uc{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-4-R15n5ud{text-align: center !important;width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-5-R19n5ud{padding-top: 16px !important;text-align: center !important;width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-1-R15ud{width: 100% !important;display: block !important;}.bui-mobile-2-R15ud{width: 100% !important;display: block !important;}.bui-mobile-3-R15ud{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-4-R9dn1dug{padding-bottom: 4px !important;width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-5-Radn1dug{padding-top: 4px !important;width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-1-R71dug{width: 100% !important;display: block !important;}.bui-mobile-2-R71dug{width: 100% !important;display: block !important;}.bui-mobile-3-R71dug{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-9-R9dn2dug{padding-bottom: 4px !important;width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-10-Radn2dug{padding-top: 4px !important;width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-6-R72dug{width: 100% !important;display: block !important;}.bui-mobile-7-R72dug{width: 100% !important;display: block !important;}.bui-mobile-8-R72dug{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-14-R9dn3dug{padding-bottom: 4px !important;width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-15-Radn3dug{padding-top: 4px !important;width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-11-R73dug{width: 100% !important;display: block !important;}.bui-mobile-12-R73dug{width: 100% !important;display: block !important;}.bui-mobile-13-R73dug{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-19-R9dn4dug{padding-bottom: 4px !important;width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-20-Radn4dug{padding-top: 4px !important;width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-16-R74dug{width: 100% !important;display: block !important;}.bui-mobile-17-R74dug{width: 100% !important;display: block !important;}.bui-mobile-18-R74dug{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-24-R9dn5dug{padding-bottom: 4px !important;width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-25-Radn5dug{padding-top: 4px !important;width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-21-R75dug{width: 100% !important;display: block !important;}.bui-mobile-22-R75dug{width: 100% !important;display: block !important;}.bui-mobile-23-R75dug{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-29-R9dn6dug{padding-bottom: 4px !important;width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-30-Radn6dug{padding-top: 4px !important;width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-26-R76dug{width: 100% !important;display: block !important;}.bui-mobile-27-R76dug{width: 100% !important;display: block !important;}.bui-mobile-28-R76dug{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-34-R9dn7dug{padding-bottom: 4px !important;width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-35-Radn7dug{padding-top: 4px !important;width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-31-R77dug{width: 100% !important;display: block !important;}.bui-mobile-32-R77dug{width: 100% !important;display: block !important;}.bui-mobile-33-R77dug{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-1-Rdq6rul{width: 100% !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-4-Rhdun{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-5-Radun{height: 16px !important;width: 16px !important;}.bui-mobile-6-Radun{height: 16px !important;width: 16px !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-7-Ridun{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-8-Rbdun{height: 16px !important;width: 16px !important;}.bui-mobile-9-Rbdun{height: 16px !important;width: 16px !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-10-Rjdun{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-11-Rcdun{height: 16px !important;width: 16px !important;}.bui-mobile-12-Rcdun{height: 16px !important;width: 16px !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-13-Rkdun{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-1-Ren{width: 100% !important;display: block !important;}.bui-mobile-2-Ren{width: 100% !important;display: block !important;}.bui-mobile-3-Ren{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-4-Rhduo{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-5-Raduo{height: 16px !important;width: 16px !important;}.bui-mobile-6-Raduo{height: 16px !important;width: 16px !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-7-Riduo{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-8-Rbduo{height: 16px !important;width: 16px !important;}.bui-mobile-9-Rbduo{height: 16px !important;width: 16px !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-10-Rjduo{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-11-Rcduo{height: 16px !important;width: 16px !important;}.bui-mobile-12-Rcduo{height: 16px !important;width: 16px !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-13-Rkduo{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-1-Reo{width: 100% !important;display: block !important;}.bui-mobile-2-Reo{width: 100% !important;display: block !important;}.bui-mobile-3-Reo{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">.links-black, .links-black div, .links-black a, a[x-apple-data-detectors] {
    color: #1a1a1a !important;
    text-decoration: none !important;
  }</style>
  <style data-react-helmet="true">body { margin: 0px;padding: 0px; }</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-4-Rhdup{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-5-Radup{height: 16px !important;width: 16px !important;}.bui-mobile-6-Radup{height: 16px !important;width: 16px !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-7-Ridup{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-8-Rbdup{height: 16px !important;width: 16px !important;}.bui-mobile-9-Rbdup{height: 16px !important;width: 16px !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-10-Rjdup{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-11-Rcdup{height: 16px !important;width: 16px !important;}.bui-mobile-12-Rcdup{height: 16px !important;width: 16px !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-13-Rkdup{width: 100% !important;display: block !important;}}</style>
  <style data-react-helmet="true">@media only screen and (max-width: 575px) {.bui-mobile-1-Rep{width: 100% !important;display: block !important;}.bui-mobile-2-Rep{width: 100% !important;display: block !important;}.bui-mobile-3-Rep{width: 100% !important;display: block !important;}}</style>
 </head>
 <body class="body" style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;">
  <center class="full-wrap">
   <div data-capla-component-boundary="b-post-booking-web-email-rendering-service/ConfirmationEmailComponents/header">
    <div>
    </div>
    <div style="font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
     <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
      <tbody>
       <tr>
        <td style="background-color:#003b95;color:#ffffff;padding-left:16px;padding-right:16px">
         <div>
         </div>
         <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:624px" width="100%">
          <tbody>
           <tr>
            <td>
             <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
              <tbody>
               <tr>
                <td style="padding-top:16px;padding-bottom:16px">
                 <table border="0" cellpadding="0" cellspacing="0" class="bui-mobile-1-R15uc" role="presentation" style="width:100%;display:table">
                  <tbody class="bui-mobile-2-R15uc" style="width:100%;display:table-row-group">
                   <tr class="bui-mobile-3-R15uc" style="width:100%;display:table-row">
                    <td class="bui-mobile-4-R15n5uc" style="width:50%;display:table-cell;text-align:left;vertical-align:middle;font-weight:normal"><a href="https://booking.com" rel="noreferrer" style="text-decoration:none;color:inherit;display:inline-block;vertical-align:middle" target="_blank"><img alt="Booking.com" border="none" class="" height="24" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="display:block;border:none;width:144px;height:24px" width="144" /></a></td>
                    <td class="bui-mobile-5-R19n5uc" style="width:50%;display:table-cell;text-align:right;vertical-align:middle;font-weight:normal">
                     <div style="display:inline-block;text-align:left"><span style="margin:0;color:#ffffff;font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"><span style="color:#ffffff">Bestätigungsnummer: </span><strong style="color:#ffffff">5014471254</strong><br /><span style="color:#ffffff">PIN: </span><strong style="color:#ffffff">4116</strong> <span style="color:#ffffff">(Vertraulich)</span></span></div>
                    </td>
                   </tr>
                  </tbody>
                 </table>
                </td>
               </tr>
              </tbody>
             </table>
            </td>
           </tr>
          </tbody>
         </table>
         <div>
         </div>
        </td>
       </tr>
      </tbody>
     </table>
    </div>
   </div>
   <table>
    <tr>
     <td height="24">
     </td>
    </tr>
   </table>
   <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
    <tr>
     <td height="1" style="background-color:#FFF;height:1px;font-size:1px;mso-line-height-rule:exactly;line-height:1px;padding:0;">



</td>
    </tr>
    <tr>
     <td height="1" style="background-color:#FFF;height:1px;font-size:1px;mso-line-height-rule:exactly;line-height:1px;padding:0;"></td>
     <td align="center" width="100%">
      <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px;" width="100%">
       <tr>
        <td align="center">
         <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px;" width="100%">
          <tr>
           <td align="left" style="padding: 0 8px;">
            <div data-capla-component-boundary="b-post-booking-web-email-rendering-service/ConfirmationEmailComponents/reassurance">
             <div>
             </div>
             <div style="font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
              <div style="width:100%;display:block">
               <div style="width:100%;display:block">
                <div style="width:100%;display:block">
                 <div class="" style="display:block;text-align:left;vertical-align:top;font-weight:normal">
                  <h1 style="margin:0;color:inherit;font-size:24px;line-height:32px;font-weight:700;font-family:&quot;Avenir Next&quot;, BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">Vielen Dank, ${name}! Ihre Buchung für ${tournamentName} ist bestätigt.</h1>
                 </div>
                 <div class="" style="width:12px"><span style="height:12px;width:12px;display:block;line-height:0"><img alt="" height="12" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="height:12px;width:12px;line-height:0" width="12" /></span></div>
                 <div class="" style="display:block;text-align:left;vertical-align:top;font-weight:normal">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;display:table">
                   <tbody style="width:100%;display:table-row-group">
                    <tr style="width:100%;display:table-row">
                     <td class="" style="width:16px;display:table-cell;text-align:left;vertical-align:top;font-weight:normal"><img class="" height="13" role="presentation" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="display:inline-block;border:none;width:16;height:13" width="16" /></td>
                     <td class="" style="width:8px"><span style="height:8px;width:8px;display:block;line-height:0"><img alt="" height="8" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="height:8px;width:8px;line-height:0" width="8" /></span></td>
                     <td class="" style="display:table-cell;text-align:left;vertical-align:top;font-weight:normal"><span style="margin:0;color:inherit;font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">Die Unterkunft <strong>${hostName}</strong> erwartet Sie am <strong>${checkinDate}</strong>.</span></td>
                    </tr>
                   </tbody>
                  </table>
                 </div>
                 <div class="" style="width:12px"><span style="height:12px;width:12px;display:block;line-height:0"><img alt="" height="12" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="height:12px;width:12px;line-height:0" width="12" /></span></div>
                 <div class="" style="display:block;text-align:left;vertical-align:top;font-weight:normal">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;display:table">
                   <tbody style="width:100%;display:table-row-group">
                    <tr style="width:100%;display:table-row">
                     <td class="" style="width:16px;display:table-cell;text-align:left;vertical-align:top;font-weight:normal"><img class="" height="13" role="presentation" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="display:inline-block;border:none;width:16;height:13" width="16" /></td>
                     <td class="" style="width:8px"><span style="height:8px;width:8px;display:block;line-height:0"><img alt="" height="8" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="height:8px;width:8px;line-height:0" width="8" /></span></td>
                     <td class="" style="display:table-cell;text-align:left;vertical-align:top;font-weight:normal"><span style="margin:0;color:inherit;font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">Mit nur wenigen Klicks können Sie <a href="https://secure.booking.com/confirmation.de.html?bn=5014471254&amp;pbsource=conf_email_modify&amp;pbtrack=email_mainCTA&amp;source=conf_email&amp;from_conf_email_tracking=1&amp;from_conf_email_source=1&amp;blockout_source=1&amp;from_conf_email_apps=1&amp;mp_blockout_cta_track_non_pbb=non_pbb_button_change_book_cta" rel="noreferrer" style="text-decoration:underline;color:#006ce4;display:inline" target="_blank"><span style="font-weight:bold">Änderungen an Ihrer Buchung vornehmen oder der Unterkunft eine Frage stellen</span></a></span></td>
                    </tr>
                   </tbody>
                  </table>
                 </div>
                 <div class="" style="width:12px"><span style="height:12px;width:12px;display:block;line-height:0"><img alt="" height="12" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="height:12px;width:12px;line-height:0" width="12" /></span></div>
                 <div class="" style="display:block;text-align:left;vertical-align:top;font-weight:normal">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;display:table">
                   <tbody style="width:100%;display:table-row-group">
                    <tr style="width:100%;display:table-row">
                     <td class="" style="width:16px;display:table-cell;text-align:left;vertical-align:top;font-weight:normal"><img class="" height="16" role="presentation" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="display:inline-block;border:none;width:16;height:16" width="16" /></td>
                     <td class="" style="width:8px"><span style="height:8px;width:8px;display:block;line-height:0"><img alt="" height="8" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="height:8px;width:8px;line-height:0" width="8" /></span></td>
                     <td class="" style="display:table-cell;text-align:left;vertical-align:top;font-weight:normal"><span style="margin:0;color:inherit;font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">Bitte halten Sie Ihre Buchungs-PIN geheim, denn diese Nummer kann zur Änderung oder Stornierung Ihrer Buchung verwendet werden.</span></td>
                    </tr>
                   </tbody>
                  </table>
                 </div>
                </div>
               </div>
              </div><span class="" style="height:12px;width:12px;display:block;line-height:0"><img alt="" height="12" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="height:12px;width:12px;line-height:0" width="12" /></span></div>
            </div>
           </td>
          </tr>
          <tr>
           <td align="left" style="padding: 0 8px;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
            </table>
           </td>
          </tr>
          <tr>
           <td height="20">
           </td>
          </tr>
         </table>
         <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px;" width="100%">
          <tr>
           <td>
            <div data-capla-component-boundary="b-post-booking-web-email-rendering-service/ConfirmationEmailComponents/propertyDetails">
             <div>
             </div>
             <div style="font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
               <tbody>
                <tr>
                 <td style="padding-left:8px;padding-right:8px">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;display:table">
                   <tbody style="width:100%;display:table-row-group">
                    <tr style="width:100%;display:table-row">
                     <td class="" style="width:100%;display:table-cell;text-align:left;vertical-align:top;font-weight:normal"><a href="https://www.booking.com/hotel/at/salzburger-hof-bad-gastein.html" rel="noreferrer" style="text-decoration:none;color:inherit" target="_blank"><h1 style="margin:0;color:inherit;font-size:20px;line-height:28px;font-weight:700;font-family:&quot;Avenir Next&quot;, BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">${hostName} (Privatzimmer)</h1></a></td>
                    </tr>
                   </tbody>
                  </table>
                 </td>
                </tr>
               </tbody>
              </table><span class="" style="height:16px;width:16px;display:block;line-height:0"><img alt="" height="16" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="height:16px;width:16px;line-height:0" width="16" /></span></div>
            </div>
           </td>
          </tr>
         </table>
         <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px;" width="100%">
          <tr>
           <td align="left" style="padding: 0 8px;">
            <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: separate;" width="100%">
             <tr>
              <td style="border: 1px solid; padding: 16px; background-color: #FEFBF0; border-color: #FFE08A; border-radius: 4px;">
               <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                <tr>
                 <td valign="top" width="24"><img alt="" height="24" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" width="24" /></td>
                 <td width="16">
                 </td>
                 <td style="font-size:16px; line-height:24px; font-weight:normal; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #333333;" valign="top">
                  <h3 style="font-size:16px; line-height:24px; font-weight:bold; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;; margin: 0; padding: 0 0 8px;">
Ihre Buchung wird mit Booking.com bezahlt
</h3>
                  <p style="font-size:14px; line-height:20px; font-weight:400; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;; margin: 0; padding: 0;">
Vor dem Aufenthalt ist keine weitere Zahlung nötig. Bitte melden Sie alle anderen Zahlungsaufforderungen, die Sie vor Ihrem Aufenthalt erhalten, und klicken Sie nicht auf Zahlungslinks Um Ihre Buchungsinformationen zu verwalten, gehen Sie immer direkt zu Booking.com oder unserer App.
<br />
                   <br />
Wir werden Sie niemals bitten, Ihre Kontodaten, personenbezogenen Informationen oder Zahlungsinformationen per Telefon, E-Mail oder Chat (z.B. WhatsApp) weiterzugeben.
<div style="margin-top: 16px"><a aria-label="Erfahren Sie mehr über Sicherheit im Internet" href="https://www.booking.com/trust-and-safety/travellers.de.html?aid=2311236" style="color: #0071c2; text-decoration: none" target="_blank">
Mehr erfahren
</a></div>
                 </td>
                </tr>
               </table>
              </td>
             </tr>
            </table>
           </td>
          </tr>
          <tr>
           <td height="32">
           </td>
          </tr>
         </table>
         <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px;" width="100%">
          <tr>
           <td>
            <h2 align="left" style="font-size:16px; line-height:24px; font-weight:bold; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #333333; padding: 0 8px; display: table-cell;">
Buchungsinformationen
</h2>
           </td>
          </tr>
          <tr>
           <td height="16">
           </td>
          </tr>
          <tr>
           <td style="padding: 0 8px;">
            <div data-capla-component-boundary="b-post-booking-web-email-rendering-service/ConfirmationEmailComponents/resDetailsTable">
             <div>
             </div>
             <div style="font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
              <div style="border-left:1px solid #e7e7e7;border-right:1px solid #e7e7e7">
               <div style="width:100%;display:block">
                <div style="width:100%;display:block">
                 <div style="width:100%;display:block">
                  <div class="" style="display:block;text-align:left;vertical-align:top;font-weight:normal">
                   <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-top:1px solid #e7e7e7" width="100%">
                    <tbody>
                     <tr>
                      <td style="padding-left:16px;padding-right:16px">
                       <table border="0" cellpadding="0" cellspacing="0" class="bui-mobile-1-R71dug" role="presentation" style="width:100%;display:table">
                        <tbody class="bui-mobile-2-R71dug" style="width:100%;display:table-row-group">
                         <tr class="bui-mobile-3-R71dug" style="width:100%;display:table-row">
                          <td class="bui-mobile-4-R9dn1dug" style="padding-top:16px;padding-bottom:16px;width:224px;display:table-cell;text-align:left;vertical-align:top;font-weight:normal"><span style="margin:0;color:#595959;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">Anreise</span></td>
                          <td class="bui-mobile-5-Radn1dug" style="padding-top:16px;padding-bottom:16px;display:table-cell;text-align:left;vertical-align:top;font-weight:normal"><span style="margin:0;color:inherit;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">${checkinDateFull}</span> <span style="margin:0;color:#595959;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">(18:00 - 23:59)</span></td>
                         </tr>
                        </tbody>
                       </table>
                      </td>
                     </tr>
                    </tbody>
                   </table>
                  </div>
                  <div class="" style="display:block;text-align:left;vertical-align:top;font-weight:normal">
                   <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-top:1px solid #e7e7e7" width="100%">
                    <tbody>
                     <tr>
                      <td style="padding-left:16px;padding-right:16px">
                       <table border="0" cellpadding="0" cellspacing="0" class="bui-mobile-6-R72dug" role="presentation" style="width:100%;display:table">
                        <tbody class="bui-mobile-7-R72dug" style="width:100%;display:table-row-group">
                         <tr class="bui-mobile-8-R72dug" style="width:100%;display:table-row">
                          <td class="bui-mobile-9-R9dn2dug" style="padding-top:16px;padding-bottom:16px;width:224px;display:table-cell;text-align:left;vertical-align:top;font-weight:normal"><span style="margin:0;color:#595959;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">Abreise</span></td>
                          <td class="bui-mobile-10-Radn2dug" style="padding-top:16px;padding-bottom:16px;display:table-cell;text-align:left;vertical-align:top;font-weight:normal"><span style="margin:0;color:inherit;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">${checkoutDateFull}</span> <span style="margin:0;color:#595959;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">(08:00 - 12:00)</span></td>
                         </tr>
                        </tbody>
                       </table>
                      </td>
                     </tr>
                    </tbody>
                   </table>
                  </div>
                  <div class="" style="display:block;text-align:left;vertical-align:top;font-weight:normal">
                   <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-top:1px solid #e7e7e7" width="100%">
                    <tbody>
                     <tr>
                      <td style="padding-left:16px;padding-right:16px">
                       <table border="0" cellpadding="0" cellspacing="0" class="bui-mobile-11-R73dug" role="presentation" style="width:100%;display:table">
                        <tbody class="bui-mobile-12-R73dug" style="width:100%;display:table-row-group">
                         <tr class="bui-mobile-13-R73dug" style="width:100%;display:table-row">
                          <td class="bui-mobile-14-R9dn3dug" style="padding-top:16px;padding-bottom:16px;width:224px;display:table-cell;text-align:left;vertical-align:top;font-weight:normal"><span style="margin:0;color:#595959;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">Ihre Buchung</span></td>
                          <td class="bui-mobile-15-Radn3dug" style="padding-top:16px;padding-bottom:16px;display:table-cell;text-align:left;vertical-align:top;font-weight:normal"><span style="margin:0;color:inherit;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"> 1 Nacht</span><span style="margin:0;color:inherit;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">, <span style="margin:0;color:inherit">Einzelzimmer </span></span></td>
                         </tr>
                        </tbody>
                       </table>
                      </td>
                     </tr>
                    </tbody>
                   </table>
                  </div>
                  <div class="" style="display:block;text-align:left;vertical-align:top;font-weight:normal">
                   <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-top:1px solid #e7e7e7" width="100%">
                    <tbody>
                     <tr>
                      <td style="padding-left:16px;padding-right:16px">
                       <table border="0" cellpadding="0" cellspacing="0" class="bui-mobile-16-R74dug" role="presentation" style="width:100%;display:table">
                        <tbody class="bui-mobile-17-R74dug" style="width:100%;display:table-row-group">
                         <tr class="bui-mobile-18-R74dug" style="width:100%;display:table-row">
                          <td class="bui-mobile-19-R9dn4dug" style="padding-top:16px;padding-bottom:16px;width:224px;display:table-cell;text-align:left;vertical-align:top;font-weight:normal"><span style="margin:0;color:#595959;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">Sie haben gebucht für</span></td>
                          <td class="bui-mobile-20-Radn4dug" style="padding-top:16px;padding-bottom:16px;display:table-cell;text-align:left;vertical-align:top;font-weight:normal"><span style="margin:0;color:inherit;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">1 Gast</span></td>
                         </tr>
                        </tbody>
                       </table>
                      </td>
                     </tr>
                    </tbody>
                   </table>
                  </div>
                  <div class="" style="display:block;text-align:left;vertical-align:top;font-weight:normal">
                   <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-top:1px solid #e7e7e7" width="100%">
                    <tbody>
                     <tr>
                      <td style="padding-left:16px;padding-right:16px">
                       <table border="0" cellpadding="0" cellspacing="0" class="bui-mobile-21-R75dug" role="presentation" style="width:100%;display:table">
                        <tbody class="bui-mobile-22-R75dug" style="width:100%;display:table-row-group">
                         <tr class="bui-mobile-23-R75dug" style="width:100%;display:table-row">
                          <td class="bui-mobile-24-R9dn5dug" style="padding-top:16px;padding-bottom:16px;width:224px;display:table-cell;text-align:left;vertical-align:top;font-weight:normal"><span style="margin:0;color:#595959;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">Lage</span></td>
                          <td class="bui-mobile-25-Radn5dug" style="padding-top:16px;padding-bottom:16px;display:table-cell;text-align:left;vertical-align:top;font-weight:normal"><span style="margin:0;color:inherit;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"><address style="font-style:normal">${roomDescription}</address></span></td>
                         </tr>
                        </tbody>
                       </table>
                      </td>
                     </tr>
                    </tbody>
                   </table>
                  </div>
                  <div class="" style="display:block;text-align:left;vertical-align:top;font-weight:normal">
                   <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-top:1px solid #e7e7e7" width="100%">
                    <tbody>
                     <tr>
                      <td style="padding-left:16px;padding-right:16px">
                       <table border="0" cellpadding="0" cellspacing="0" class="bui-mobile-26-R76dug" role="presentation" style="width:100%;display:table">
                        <tbody class="bui-mobile-27-R76dug" style="width:100%;display:table-row-group">
                         <tr class="bui-mobile-28-R76dug" style="width:100%;display:table-row">
                          <td class="bui-mobile-29-R9dn6dug" style="padding-top:16px;padding-bottom:16px;width:224px;display:table-cell;text-align:left;vertical-align:top;font-weight:normal"><span style="margin:0;color:#595959;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">Telefon</span></td>
                          <td class="bui-mobile-30-Radn6dug" style="padding-top:16px;padding-bottom:16px;display:table-cell;text-align:left;vertical-align:top;font-weight:normal"><a href="tel:+43%206434%2020370" rel="noreferrer" style="text-decoration:underline;color:#006ce4;display:inline" target="_blank"><span style="margin:0;color:inherit;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">+43 6434 20370</span></a></td>
                         </tr>
                        </tbody>
                       </table>
                      </td>
                     </tr>
                    </tbody>
                   </table>
                  </div>
                  <div class="" style="display:block;text-align:left;vertical-align:top;font-weight:normal">
                   <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-top:1px solid #e7e7e7" width="100%">
                    <tbody>
                     <tr>
                      <td style="padding-left:16px;padding-right:16px">
                       <table border="0" cellpadding="0" cellspacing="0" class="bui-mobile-31-R77dug" role="presentation" style="width:100%;display:table">
                        <tbody class="bui-mobile-32-R77dug" style="width:100%;display:table-row-group">
                         <tr class="bui-mobile-33-R77dug" style="width:100%;display:table-row">
                          <td class="bui-mobile-34-R9dn7dug" style="padding-top:16px;padding-bottom:16px;width:224px;display:table-cell;text-align:left;vertical-align:top;font-weight:normal"><span style="margin:0;color:#595959;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">Kontakt</span></td>
                          <td class="bui-mobile-35-Radn7dug" style="padding-top:16px;padding-bottom:16px;display:table-cell;text-align:left;vertical-align:top;font-weight:normal"><a href="mailto:5014471254-s6dt.mbqc.u8ht.mux7@property.booking.com" rel="noreferrer" style="text-decoration:underline;color:#006ce4;display:inline" target="_blank"><span style="margin:0;color:inherit;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">E-Mail an Unterkunft</span></a></td>
                         </tr>
                        </tbody>
                       </table>
                      </td>
                     </tr>
                    </tbody>
                   </table>
                  </div>
                  <div class="" style="display:block;text-align:left;vertical-align:top;font-weight:normal">
                  </div>
                 </div>
                </div>
               </div>
              </div>
             </div>
            </div>
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: separate;" width="100%">
             <tr>
              <td style="border: 1px solid #E6E6E6;">
               <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                <tr>
                 <td style="">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:622px; " width="100%">
                   <tr>
                    <td>
                     <table align="left" border="0" cellpadding="0" cellspacing="0" class="m-no-max-width" role="presentation" style="max-width:224px;" width="100%">
                      <tr>
                       <td align="left" class="small-padding-bottom" style="font-size:16px; line-height:24px; font-weight:normal; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#6B6B6B; padding:16px;">
Stornierungsbedingungen
</td>
                      </tr>
                     </table>
                     <table align="left" border="0" cellpadding="0" cellspacing="0" class="m-no-max-width" role="presentation" style="max-width:382px;" width="100%">
                      <tr>
                       <td align="left" class="remove-borders remove-padding-top" style="font-size:16px; line-height:24px; font-weight:normal; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#333333; padding:16px;">
Bei Stornierung, Buchungsänderung oder Nichtanreise zahlen Sie als Gebühr einen Betrag in Höhe des Gesamtpreises.
</td>
                      </tr>
                     </table>
                    </td>
                   </tr>
                  </table>
                 </td>
                </tr>
                <tr>
                 <td style="">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:622px; border-top: 1px solid #E6E6E6;" width="100%">
                   <tr>
                    <td>
                     <table align="left" border="0" cellpadding="0" cellspacing="0" class="m-no-max-width" role="presentation" style="max-width:224px;" width="100%">
                      <tr>
                       <td align="left" class="small-padding-bottom" style="font-size:16px; line-height:24px; font-weight:normal; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#6B6B6B; padding:16px;">
Stornierungsgebühren
</td>
                      </tr>
                     </table>
                     <table align="left" border="0" cellpadding="0" cellspacing="0" class="m-no-max-width" role="presentation" style="max-width:382px;" width="100%">
                      <tr>
                       <td align="left" class="remove-borders remove-padding-top" style="font-size:16px; line-height:24px; font-weight:normal; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#333333; padding:16px;">
                        <ul style="margin: 0; margin-left: 20px; padding: 0;">
                         <li><span>
<span>
bis 6. April 2026 23:59:
</span>
<span style="white-space:nowrap;">
€ 0,00
</span>
</span><li><span>
<span>
ab 7. April 2026 00:00:
</span>
<span style="white-space:nowrap;">
€ 0,00
</span>
</span><li><span style="color:#CC0000;">Diese Buchung ist nicht kostenfrei stornierbar. Sie können die Daten Ihres Aufenthalts nicht ändern.</span></ul>
                        <p style="font-size: 14px; margin-bottom: 0;">
Die Stornierungsfristen gelten gemäß der Zeitzone der Unterkunft.
</td>
                      </tr>
                     </table>
                    </td>
                   </tr>
                  </table>
                 </td>
                </tr>
               </table>
              </td>
             </tr>
            </table>
           </td>
          </tr>
          <tr>
           <td height="32">
           </td>
          </tr>
         </table>
         <div data-capla-component-boundary="b-post-booking-web-email-rendering-service/ConfirmationEmailComponents/PriceDetailsTable">
          <div>
          </div>
          <div style="font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
           <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
            <tbody>
             <tr>
              <td style="padding-bottom:16px;padding-left:16px;padding-right:16px">
               <div>
               </div>
               <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:624px" width="100%">
                <tbody>
                 <tr>
                  <td>
                   <h2 style="margin:0;color:inherit;font-size:16px;line-height:24px;font-weight:700;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">Preisangaben</h2>
                  </td>
                 </tr>
                </tbody>
               </table>
               <div>
               </div>
              </td>
             </tr>
             <tr>
              <td style="padding-bottom:32px;padding-left:16px;padding-right:16px">
               <div>
               </div>
               <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:624px" width="100%">
                <tbody>
                 <tr>
                  <td>
                   <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #e7e7e7" width="100%">
                    <tbody>
                     <tr>
                      <td style="padding:16px">
                       <div style="width:100%;display:block">
                        <div style="width:100%;display:block">
                         <div style="width:100%;display:block">
                          <div class="" style="display:block;text-align:left;vertical-align:top;font-weight:normal">
                           <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;display:table">
                            <tbody style="width:100%;display:table-row-group">
                             <tr style="width:100%;display:table-row">
                              <td class="" style="width:75%;display:table-cell;text-align:left;vertical-align:top;font-weight:normal">
                               <div style="margin:0;color:inherit;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">1 Einzelzimmer </div>
                              </td>
                              <td class="" style="width:25%;display:table-cell;text-align:right;vertical-align:top;font-weight:normal">
                               <div style="margin:0;color:inherit;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">€ 0,00</div>
                              </td>
                             </tr>
                            </tbody>
                           </table>
                           <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;display:table">
                            <tbody style="width:100%;display:table-row-group">
                             <tr style="width:100%;display:table-row">
                             </tr>
                            </tbody>
                           </table>
                          </div>
                          <div class="" style="display:block;text-align:left;vertical-align:top;font-weight:normal">
                           <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;display:table">
                            <tbody style="width:100%;display:table-row-group">
                             <tr style="width:100%;display:table-row">
                              <td class="" style="width:75%;display:table-cell;text-align:left;vertical-align:top;font-weight:normal">
                               <div style="margin:0;color:inherit;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">Mehrwertsteuer</div>
                              </td>
                              <td class="" style="width:25%;display:table-cell;text-align:right;vertical-align:top;font-weight:normal">
                               <div style="margin:0;color:inherit;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">€ 8</div>
                              </td>
                             </tr>
                            </tbody>
                           </table>
                           <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;display:table">
                            <tbody style="width:100%;display:table-row-group">
                             <tr style="width:100%;display:table-row">
                             </tr>
                            </tbody>
                           </table>
                          </div>
                          <div class="" style="display:block;text-align:left;vertical-align:top;font-weight:normal">
                           <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;display:table">
                            <tbody style="width:100%;display:table-row-group">
                             <tr style="width:100%;display:table-row">
                              <td class="" style="width:75%;display:table-cell;text-align:left;vertical-align:top;font-weight:normal">
                               <div style="margin:0;color:inherit;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">Übernachtungssteuer</div>
                              </td>
                              <td class="" style="width:25%;display:table-cell;text-align:right;vertical-align:top;font-weight:normal">
                               <div style="margin:0;color:inherit;font-size:16px;line-height:24px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">€ 3</div>
                              </td>
                             </tr>
                            </tbody>
                           </table>
                           <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;display:table">
                            <tbody style="width:100%;display:table-row-group">
                             <tr style="width:100%;display:table-row">
                             </tr>
                            </tbody>
                           </table>
                          </div>
                          <div class="" style="padding-top:16px;padding-bottom:16px;display:block;text-align:left;vertical-align:top;font-weight:normal">
                           <hr style="height:1px;background:#e7e7e7;border:0;margin:0" />
                          </div>
                          <div class="" style="display:block;text-align:left;vertical-align:top;font-weight:normal">
                           <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;display:table">
                            <tbody style="width:100%;display:table-row-group">
                             <tr style="width:100%;display:table-row">
                              <td class="" style="width:75%;display:table-cell;text-align:left;vertical-align:top;font-weight:normal">
                               <div style="margin:0;color:inherit;font-size:20px;line-height:28px;font-weight:700;font-family:&quot;Avenir Next&quot;, BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">Gesamtpreis</div>
                              </td>
                              <td class="" style="width:25%;display:table-cell;text-align:right;vertical-align:top;font-weight:normal">
                               <div style="margin:0;color:inherit;font-size:20px;line-height:28px;font-weight:700;font-family:&quot;Avenir Next&quot;, BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">€ 0,00</div>
                              </td>
                             </tr>
                            </tbody>
                           </table>
                           <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;display:table">
                            <tbody style="width:100%;display:table-row-group">
                             <tr style="width:100%;display:table-row">
                             </tr>
                            </tbody>
                           </table>
                          </div>
                         </div>
                        </div>
                       </div>
                      </td>
                     </tr>
                    </tbody>
                   </table>
                  </td>
                 </tr>
                </tbody>
               </table>
               <div>
               </div>
              </td>
             </tr>
            </tbody>
           </table>
          </div>
         </div>
         <div data-capla-component-boundary="b-post-booking-web-email-rendering-service/ConfirmationEmailComponents/geniusVip/priceMatchBanner">
          <div>
          </div>
          <div style="font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
          </div>
         </div>
         <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px;" width="100%">
          <tr>
           <td align="left" style="padding: 0 8px;">
            <table cellpadding="0" cellspacing="0" role="presentation" style="width: 100%; padding: 16px; background-color: #FFFFFF;">
             <tr>
              <td style="border: 1px solid #E6E6E6; border-radius: 2px; padding: 16px;">
               <div data-capla-component-boundary="b-post-booking-web-email-rendering-service/PaymentInfoEmail/v2/default/accommodations">
                <div>
                </div>
                <div style="font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
                 <table align="center" border="0" cellpadding="0" cellspacing="0" class="payment-info" width="100%">
                  <tbody>
                   <tr>
                    <td style="padding:0 0 16px">
                     <h3 style="margin:0;color:inherit;font-size:20px;line-height:28px;font-weight:700;font-family:&quot;Avenir Next&quot;, BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">Zahlungsinformationen</h3>
                    </td>
                   </tr>
                   <tr>
                    <td>
                     <div data-testid="payment-status-statement"><span style="margin:0;color:inherit;font-size:14px;line-height:20px;font-weight:700;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">Sie haben </span><span style="margin:0;color:#008234;font-size:14px;line-height:20px;font-weight:700;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">€ 0,00</span><span style="margin:0;color:inherit;font-size:14px;line-height:20px;font-weight:700;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"> für diese Buchung bezahlt.</span></div>
                    </td>
                   </tr>
                   <tr>
                    <td style="padding:16px 0">
                     <div style="height:1px;background-color:#e7e7e7">
                     </div>
                    </td>
                   </tr>
                   <tr>
                    <td>
                     <table align="center" border="0" cellpadding="0" cellspacing="0" role="list" width="100%">
                      <tbody>
                       <tr>
                        <td data-testid="transaction-title-email-container"><span class="b99b6ef58f" style="font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;text-align:left;vertical-align:middle;color:#1a1a1a">${bookingDate}</span></td>
                       </tr>
                       <tr>
                        <td>
                         <table align="center" border="0" cellpadding="0" cellspacing="0" role="listitem" style="border-collapse:collapse;margin-top:8px;width:100%" width="100%">
                          <tbody>
                           <tr>
                            <td><span aria-label="Visa" style="display:inline-block;vertical-align:middle" title="Visa"><i data-testid="payment-instrument-icon" role="img" style="margin-left:0;margin-right:4px;width:40px;height:24px;float:left;vertical-align:middle;display:inline-block;background-size:contain;background-position:center center;background-repeat:no-repeat;background-image:url(https://bstatic.com/static/img/payments/payment_icons_redesign/visa@3x.png)" title="Visa"></i></span></td>
                            <td style="width:100%">
                             <div class="b99b6ef58f" style="font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;text-align:left;vertical-align:middle;color:#1a1a1a;margin-left:0;margin-right:16px;direction:ltr">•••• 0000</div>
                            </td>
                            <td data-testid="transactions-list-email-status-container" style="text-align:right"><span class="b99b6ef58f" style="font-size:12px;line-height:18px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;text-align:left;vertical-align:middle;color:#1a1a1a;margin-left:0;margin-right:16px">Bezahlt</span></td>
                            <td>
                             <div class="b99b6ef58f" style="font-size:16px;line-height:24px;font-weight:700;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;text-align:right;vertical-align:middle;white-space:nowrap">€ 0,00</div>
                            </td>
                           </tr>
                          </tbody>
                         </table>
                        </td>
                       </tr>
                      </tbody>
                     </table>
                    </td>
                   </tr>
                  </tbody>
                 </table>
                </div>
               </div>
              </td>
             </tr>
            </table>
           </td>
          </tr>
          <tr>
           <td height="16">
           </td>
          </tr>
         </table>
         <div data-capla-component-boundary="b-post-booking-web-email-rendering-service/ConfirmationEmailComponents/geniusVip/mlpBanner">
          <div>
          </div>
          <div style="font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
          </div>
         </div>
         <div data-capla-component-boundary="b-post-booking-web-email-rendering-service/ConfirmationEmailComponents/geniusVip/programModeBanner">
          <div>
          </div>
          <div style="font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
          </div>
         </div>
         <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px;" width="100%">
          <tr>
           <td>
            <h2 align="left" style="font-size:16px; line-height:24px; font-weight:bold; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #333333; padding: 0 8px; display: table-cell;">
Einzelzimmer 
</h2>
           </td>
          </tr>
          <tr>
           <td height="16">
           </td>
          </tr>
          <tr>
           <td style="padding: 0 8px;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: separate;" width="100%">
             <tr>
              <td style="border: 1px solid #E6E6E6; border-radius: 4px;">
               <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                <tr>
                 <td style="">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:622px; " width="100%">
                   <tr>
                    <td>
                     <table align="left" border="0" cellpadding="0" cellspacing="0" class="m-no-max-width" role="presentation" style="max-width:224px;" width="100%">
                      <tr>
                       <td align="left" class="small-padding-bottom" style="font-size:16px; line-height:24px; font-weight:normal; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#6B6B6B; padding:16px;">
Name des Gastes
</td>
                      </tr>
                     </table>
                     <table align="left" border="0" cellpadding="0" cellspacing="0" class="m-no-max-width" role="presentation" style="max-width:382px;" width="100%">
                      <tr>
                       <td align="left" class="remove-borders remove-padding-top" style="font-size:16px; line-height:24px; font-weight:normal; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#333333; padding:16px;">
${name}
</td>
                      </tr>
                     </table>
                    </td>
                   </tr>
                  </table>
                 </td>
                </tr>
                <tr>
                 <td style="">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:622px; border-top: 1px solid #E6E6E6;" width="100%">
                   <tr>
                    <td>
                     <table align="left" border="0" cellpadding="0" cellspacing="0" class="m-no-max-width" role="presentation" style="max-width:224px;" width="100%">
                      <tr>
                       <td align="left" class="small-padding-bottom" style="font-size:16px; line-height:24px; font-weight:normal; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#6B6B6B; padding:16px;">
Frühstück
</td>
                      </tr>
                     </table>
                     <table align="left" border="0" cellpadding="0" cellspacing="0" class="m-no-max-width" role="presentation" style="max-width:382px;" width="100%">
                      <tr>
                       <td align="left" class="remove-borders remove-padding-top" style="font-size:16px; line-height:24px; font-weight:normal; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#333333; padding:16px;">
Frühstück ist im Endpreis inbegriffen
</td>
                      </tr>
                     </table>
                    </td>
                   </tr>
                  </table>
                 </td>
                </tr>
               </table>
              </td>
             </tr>
            </table>
           </td>
          </tr>
          <tr>
           <td height="32">
           </td>
          </tr>
         </table>
         <div data-capla-component-boundary="b-post-booking-web-email-rendering-service/ConfirmationEmailComponents/CrossSellCard">
          <div>
          </div>
          <div style="font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
          </div>
         </div>
         <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px;" width="100%">
          <tr>
           <td align="left" style="padding: 0 8px;">
            <table align="left" border="0" cellpadding="0" cellspacing="0" class="m-fw" role="presentation">
             <tr>
              <td class="m-centeralign" style="padding-bottom: 8px;">
               <div data-capla-component-boundary="b-post-booking-web-email-rendering-service/ConfirmationEmailComponents/ctaToBd">
                <div>
                </div>
                <div style="font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"><a class="bui-mobile-1-Re6" href="https://secure.booking.com/confirmation.de.html?bn=5014471254&amp;pbsource=conf_email_modify&amp;pbtrack=email_mainCTA&amp;source=conf_email&amp;from_conf_email_tracking=1&amp;from_conf_email_source=1&amp;blockout_source=1&amp;from_conf_email_apps=1&amp;mp_blockout_cta_track_non_pbb=non_pbb_button_change_book_cta&amp;from_price_breakdown=1&amp;aid=2311236&amp;label=mkt123sc-c3f92498-6290-41b9-a0a4-e43c3afc67e9" rel="noreferrer" style="text-decoration:none;color:#ffffff;background:#006ce4;font-size:16px;line-height:24px;font-weight:500;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;border-radius:4px;width:auto;border:1px solid transparent;display:inline-block;text-align:center" target="_blank"><span></span><span style="display:inline-block;mso-text-raise:12px;padding:12px 16px">Ändern Sie Ihre Buchung</span><span></span></a></div>
               </div>
              </td>
             </tr>
            </table>
           </td>
          </tr>
          <tr>
           <td height="40">
           </td>
          </tr>
         </table>
         <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px;" width="100%">
          <tr>
           <td>
            <table align="left" border="0" cellpadding="0" cellspacing="0" class="m-no-max-width" role="presentation" style="max-width:156px;" width="100%">
             <tr>
              <td align="center" class="m-show-gta-image" style="padding: 8px;"><img alt="QR-Code zum Herunterladen der App" class="m-hide" height="138" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="display:block; border: 1px solid #BDBDBD;" width="138" /></td>
             </tr>
             <tr class="m-hide">
              <td align="center" class="m-hide" style="font-size:14px; line-height:20px; font-weight:normal; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #333333; padding: 0 8px;">
Code mit Handy-Kamera scannen und App herunterladen
</td>
             </tr>
            </table>
            <table align="left" border="0" cellpadding="0" cellspacing="0" class="m-no-max-width" role="presentation" style="max-width:484px;" width="100%">
             <tr>
              <td align="center" style="padding: 8px;">
               <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                <tr>
                 <td class="m-text-center" style="padding-bottom: 8px;">
                  <h2 style="font-size:24px; line-height:32px; font-weight:bold; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #333333; margin: 0;">
Gestalten Sie Ihre Reise einfacher mit der App
</h2>
                 </td>
                </tr>
                <tr>
                 <td class="m-text-center" style="padding-bottom: 16px;">
                  <p style="font-size:16px; line-height:24px; font-weight:normal; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #333333; margin: 0;">
Ändern oder stornieren Sie Buchungen von unterwegs, chatten Sie direkt mit Ihrer Unterkunft und viele weitere Optionen.
</td>
                </tr>
                <tr>
                 <td>
                  <table border="0" cellpadding="0" cellspacing="0" class="m-table-center" role="presentation">
                   <tr>
                    <td>
                     <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" style=" background:#0071C2; border-collapse:separate;border-radius:2px;">
                      <tr>
                       <td style="font-size:16px; line-height:24px; font-weight:bold; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding:12px 24px;"><a href="
https://secure.booking.com/apps.de.html?aid=2311236
" style="text-decoration:none; color:#FFFFFF;" target="_blank">
App herunterladen
</a></td>
                      </tr>
                     </table>
                    </td>
                   </tr>
                  </table>
                 </td>
                </tr>
               </table>
              </td>
             </tr>
            </table>
           </td>
          </tr>
          <tr>
           <td height="48">
           </td>
          </tr>
         </table>
         <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px;" width="100%">
          <tr>
           <td style="padding: 0px 8px;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
             <tr>
              <td align="left" valign="top" width="48"><img alt="" height="auto" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="display:block;" width="32" /></td>
              <td>
               <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                 <td align="left">
                  <h2 style="font-size:20px; line-height:28px; font-weight:bold; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #333333; padding-top: 2px; display: table-cell;">
Wichtige Einzelheiten
</h2>
                 </td>
                </tr>
                <tr>
                 <td align="left" style="padding-top: 8px;">
                  <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                   <tr>
                    <td style="font-size:16px; line-height:24px; font-weight:normal; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #333333;">
                     <ul align="left" style="margin:0; margin-left: 24px; padding:0;" type="disc">
                      <li style="margin:0; padding: 4px 0;">
Wegen des Coronavirus (COVID-19) wurden in dieser Unterkunft zusätzliche Sicherheits- und Hygienemaßnahmen unternommen.
<li style="margin:0; padding: 4px 0;">
Lizenznummer: <strong>50403-000025-2020</strong></ul>
                    </td>
                   </tr>
                  </table>
                 </td>
                </tr>
               </table>
              </td>
             </tr>
            </table>
           </td>
          </tr>
          <tr>
           <td height="32">
           </td>
          </tr>
         </table>
         <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px;" width="100%">
          <tr>
           <td style="padding: 0px 8px;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
             <tr>
              <td align="left" valign="top" width="48"><img alt="" height="auto" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="display:block;" width="32" /></td>
              <td>
               <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                 <td align="left">
                  <h2 style="font-size:20px; line-height:28px; font-weight:bold; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #333333; padding-top: 2px; display: table-cell;">
Reisen mit dem Gefühl von Sicherheit
</h2>
                 </td>
                </tr>
                <tr>
                 <td align="left" style="padding-top: 8px;">
                  <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                   <tr>
                    <td style="font-size:16px; line-height:24px; font-weight:normal; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #333333;">
Informationen zu sicheren Reisen finden Sie auf unserer Seite „Sicherheit – Informationen“, die auf der Webseite und in der App verfügbar ist.
</td>
                   </tr>
                   <tr>
                    <td style="padding-top: 16px">
                     <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                       <td style="font-size:16px; line-height:24px; font-weight:bold; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;"><a href="https://www.booking.com/trust-and-safety/travellers.de.html?aid=2311236" style=" text-decoration:none; color:#0071C2;" target="_blank">
Öffnen Sie die Seite „Sicherheit – Informationen“
 »
</a></td>
                      </tr>
                     </table>
                    </td>
                   </tr>
                  </table>
                  <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-top: 16px" width="100%">
                   <tr>
                    <td style="font-size:16px; line-height:24px; font-weight:normal; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #333333;">
Sie haben Zugriff auf Notrufnummern für Ihren Aufenthalt in Österreich. Diese sind jederzeit über die App griffbereit – selbst ohne Internetverbindung.
</td>
                   </tr>
                   <tr>
                    <td style="padding-top: 16px">
                     <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                       <td style="font-size:16px; line-height:24px; font-weight:bold; font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;"><a href="https://www.booking.com/trust-and-safety/travellers.de.html?aid=2311236#tns_travellers_gonewrong" style=" text-decoration:none; color:#0071C2;" target="_blank">
Notrufnummern anzeigen
 »
</a></td>
                      </tr>
                     </table>
                    </td>
                   </tr>
                  </table>
                 </td>
                </tr>
               </table>
              </td>
             </tr>
            </table>
           </td>
          </tr>
          <tr>
           <td height="32">
           </td>
          </tr>
         </table>
        </td>
       </tr>
      </table>
     </td>
    </tr>
   </table>
   <div data-capla-component-boundary="b-post-booking-web-email-rendering-service/ConfirmationEmailComponents/footer">
    <div>
    </div>
    <div style="font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
     <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
      <tbody>
       <tr>
        <td style="background-color:#f5f5f5;border-bottom:1px solid #e7e7e7;border-top:1px solid #e7e7e7;color:#1a1a1a;padding-top:48px;padding-bottom:48px;padding-left:16px;padding-right:16px">
         <div>
         </div>
         <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:624px" width="100%">
          <tbody>
           <tr>
            <td>
             <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
              <tbody>
               <tr>
                <td class="links-black" style="padding-bottom:24px">
                 <div style="margin:0;color:inherit;font-size:16px;line-height:24px;font-weight:700;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">Booking.com</div>
                </td>
               </tr>
               <tr>
                <td style="padding-bottom:24px">
                 <address class="links-black" style="font-style:normal">
                  <div style="margin:0;color:inherit;font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;padding-bottom:4px">Oosterdokskade 163</div>
                  <div style="margin:0;color:inherit;font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;padding-bottom:4px">1011 DL Amsterdam</div>
                  <div style="margin:0;color:inherit;font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">Niederlande</div>
                 </address>
                </td>
               </tr>
               <tr>
                <td style="padding-bottom:24px">
                 <hr style="height:1px;background:#e7e7e7;border:0;margin:0" />
                </td>
               </tr>
               <tr>
                <td style="margin:0;color:inherit;font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;padding-bottom:4px">
                 <div style="margin:0;color:inherit;font-size:12px;line-height:18px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"><b>Kundenservice kontaktieren</b></div>
                </td>
               </tr>
               <tr>
                <td style="margin:0;color:inherit;font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;padding-bottom:4px">
                 <div style="margin:0;color:inherit;font-size:12px;line-height:18px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"><a href="https://secure.booking.com/help?source=conf_email" rel="noreferrer" style="text-decoration:underline;color:#1a1a1a;display:inline" target="_blank">Zu den Hilfeseiten</a></div>
                </td>
               </tr>
               <tr>
                <td style="margin:0;color:inherit;font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;padding-bottom:4px">
                 <div style="margin:0;color:inherit;font-size:12px;line-height:18px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">E-Mail: <a href="mailto:customer.service.help@booking.com" rel="noreferrer" style="text-decoration:underline;color:#1a1a1a;display:inline" target="_blank">customer.service.help@booking.com</a></div>
                </td>
               </tr>
               <tr>
                <td style="margin:0;color:inherit;font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;padding-bottom:4px">
                 <div style="margin:0;color:inherit;font-size:12px;line-height:18px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">Nummer für Deutsch: <a href="tel:01%20206092409" rel="noreferrer" style="text-decoration:underline;color:#1a1a1a;display:inline" target="_blank">01 206092409</a></div>
                </td>
               </tr>
               <tr>
                <td style="margin:0;color:inherit;font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;padding-bottom:4px">
                 <div style="margin:0;color:inherit;font-size:12px;line-height:18px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">Nummer für Deutsch: <a href="tel:+44%2020%203320%202603" rel="noreferrer" style="text-decoration:underline;color:#1a1a1a;display:inline" target="_blank">+44 20 3320 2603</a></div>
                </td>
               </tr>
               <tr>
                <td style="margin:0;color:inherit;font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;padding-bottom:4px">Für Gespräche ins nationale Festnetz fallen lokale Gebühren an. Wenn Sie die internationale Rufnummer wählen, fallen gegebenenfalls zusätzliche Gebühren an.</td>
               </tr>
               <tr>
                <td style="margin:0;color:inherit;font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;padding-bottom:4px">
                 <div style="margin:0;color:inherit">Wenn Sie sich mit Ihren Buchungsinformationen <a href="https://secure.booking.com/help?source=conf_email" rel="noreferrer" style="text-decoration:underline;color:#1a1a1a;display:inline" target="_blank">anmelden</a>, erhalten Sie Support in weiteren Sprachen.</div>
                </td>
               </tr>
               <tr>
                <td style="margin:0;color:inherit;font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;padding-bottom:4px">Wenn Sie über Booking.com mit der Unterkunft Kontakt aufnehmen, stimmen Sie der Verarbeitung der Kommunikation gemäß unseren <a href="https://www.booking.com/content/privacy.de.html?aid=2311236&amp;label=mkt123sc-c3f92498-6290-41b9-a0a4-e43c3afc67e9" rel="noreferrer" style="text-decoration:underline;color:#1a1a1a;display:inline" target="_blank">Datenschutzrichtlinien</a> zu.</td>
               </tr>
               <tr>
                <td style="padding-bottom:24px;padding-top:20px">
                 <hr style="height:1px;background:#e7e7e7;border:0;margin:0" />
                </td>
               </tr>
               <tr>
                <td style="margin:0;color:inherit;font-size:14px;line-height:20px;font-weight:400;font-family:BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"><span>Urheberrecht © 1996–2026 Booking.com. Alle Rechte vorbehalten.</span></td>
               </tr>
              </tbody>
             </table>
            </td>
           </tr>
          </tbody>
         </table>
         <div>
         </div>
        </td>
       </tr>
      </tbody>
     </table>
    </div>
   </div>
  </center><img alt="" height="1" src="https://secure.booking.com/email_opened_tracking_pixel?lang=de&aid=2311236&token=52616e646f6d49562473646523287d61fd4ea1866396e343e3cbd6e4d2726a995d3f978f0eb38e70b5b9c0a2659f9de7fc3b265997f90a57ab423c33575092f4bda445c4fb8cf998df84cf570b428b84e533b50419b39958f4707245a0e3fc66e0237fb3f6214d0d8ccba424e318d4b8fcb306a69d080457&type=confirmation_guest" width="1" /></body>
</html>
`;
