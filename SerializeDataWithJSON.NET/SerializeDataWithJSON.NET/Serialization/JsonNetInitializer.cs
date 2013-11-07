using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Kendo.Mvc.Infrastructure;
namespace SerializeDataWithJSON.NET.Serialization
{
    public class JsonNetInitializer: JavaScriptInitializer
    {
        public override IJavaScriptSerializer CreateSerializer()
        {
            return new JsonNetJavaScriptSerializer();
        }
    }
}