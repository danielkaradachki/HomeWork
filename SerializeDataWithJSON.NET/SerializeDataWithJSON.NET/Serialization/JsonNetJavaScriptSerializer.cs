using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Kendo.Mvc.Infrastructure;
using Newtonsoft.Json;
using System.Web.Script.Serialization;
namespace SerializeDataWithJSON.NET.Serialization
{
    public class JsonNetJavaScriptSerializer : IJavaScriptSerializer
    {
        public string Serialize(object value)
        {
            return JsonConvert.SerializeObject(value, new JsonSerializerSettings
            {
                ReferenceLoopHandling = ReferenceLoopHandling.Ignore,
                PreserveReferencesHandling = PreserveReferencesHandling.None
            });
        }
    }
}