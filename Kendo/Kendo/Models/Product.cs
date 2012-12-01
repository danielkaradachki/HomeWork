using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.ComponentModel.DataAnnotations;

namespace Kendo.Models
{
    [MetadataType(typeof(ProductMetadata))]
    public partial class Product
    {
    }

    public class ProductMetadata
    {
        [Required]
        [DisplayFormat(ConvertEmptyStringToNull = false, NullDisplayText = "")]
        public string ProductName { get; set; }

        [UIHint("CategoryEditor")]
        public Category Category { get; set; }
    }

}